// controllers/updatePendingAppraisalController.js

const { config } = require('../shared/config');
const sheets = require('../shared/googleSheets'); // Asegúrate de que la ruta es correcta
const appraisalStepsModule = require('../shared/appraisalSteps'); // Importa appraisalSteps
const OpenAI = require('openai'); // Asegúrate de instalar la librería OpenAI adecuada
const sendGridMail = require('@sendgrid/mail');

const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

exports.updatePendingAppraisal = async (req, res) => {
  try {
    // Loggear el payload completo recibido
    console.log('Cloud Run: Payload recibido -', JSON.stringify(req.body));

    // Verificar el shared secret
    const incomingSecret = req.headers['x-shared-secret'];
    if (incomingSecret !== config.SHARED_SECRET) {
      console.warn('Cloud Run: Autenticación fallida - Shared secret inválido.');
      return res.status(403).json({ success: false, message: 'Forbidden: Invalid shared secret.' });
    }
    console.log('Cloud Run: Shared secret verificado correctamente.');

    // Obtener los datos del payload
    let { description, images, post_id, post_edit_url, customer_email, session_id } = req.body;
    let customer_name = ''; // Inicializamos customer_name

    // Loggear cada campo individualmente
    console.log(`Cloud Run: description - ${description}`);
    console.log(`Cloud Run: images - ${JSON.stringify(images)}`);
    console.log(`Cloud Run: post_id - ${post_id}`);
    console.log(`Cloud Run: post_edit_url - ${post_edit_url}`);
    console.log(`Cloud Run: customer_email - ${customer_email}`);
    console.log(`Cloud Run: session_id - ${session_id}`);

    // Validar campos requeridos
    if (!session_id || !customer_email || !post_id || typeof images !== 'object' || !post_edit_url) {
      console.warn('Cloud Run: Datos incompletos recibidos en el endpoint.');
      console.log('Cloud Run: Enviando respuesta 400 al cliente.');
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    } else {
      console.log('Cloud Run: Todos los campos requeridos están presentes.');
    }

    // Enviar respuesta inmediatamente al cliente
    res.json({ success: true, message: 'Appraisal status updated successfully.' });
    console.log('Cloud Run: Respuesta 200 enviada al cliente.');

    // Ejecutar tareas en segundo plano sin esperar a que finalicen
    (async () => {
      try {
        // Asegurarse de que las URLs de las imágenes están definidas
        const mainImageUrl = images.main || '';
        const signatureImageUrl = images.signature || '';
        const backImageUrl = images.back || '';

        if (!mainImageUrl) {
          console.error('La imagen principal (mainImageUrl) es requerida para generar la descripción.');
          return;
        }

        // Inicializar OpenAI con la API key desde config
        const openaiApiKey = config.OPENAI_API_KEY;
        if (!openaiApiKey) {
          console.error('OPENAI_API_KEY no está configurado en las variables de entorno.');
          return;
        }

        const openai = new OpenAI({
          apiKey: openaiApiKey,
        });

        // Preparar el prompt que prefieres
        const condensedInstructions = "Describe the artwork's style, medium, color palette, and composition as accurately as possible. If any part cannot be completed, simply skip it. Provide the description in formal language, assuming you are an expert in art. The description should be less than 50 words, including only the text of the description.";

        // Construir el contenido del mensaje con las instrucciones detalladas y la imagen
        const messagesWithRoles = [
          {
            role: "user",
            content: [
              { type: "text", text: condensedInstructions },
              {
                type: "image_url",
                image_url: {
                  "url": mainImageUrl,
                  "detail": "high",
                },
              },
            ],
          },
        ];

        console.info("Enviando imagen y prompt a la API de OpenAI para la generación de la descripción.");

        // Llamar a la API de OpenAI para obtener la descripción
        let iaDescription;
        try {
          // **No cambiar el modelo 'gpt-4o' a 'gpt-4', ya que 'gpt-4o' es necesario para procesar imágenes**
          const openaiResponse = await openai.chat.completions.create({
            model: 'gpt-4o', // NO cambiar este modelo
            messages: messagesWithRoles,
          });

          iaDescription = openaiResponse.choices[0].message.content.trim();
        } catch (openAIError) {
          console.error('OpenAI API Error:', openAIError.response ? openAIError.response.data : openAIError.message);
          return; // No enviar respuesta 500 ya que ya se envió la respuesta 200 al cliente
        }

        console.info(`Descripción generada por IA: ${iaDescription}`);

        // Actualizar el título del post en WordPress
        try {
          const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${post_id}`;
          const authHeader = 'Basic ' + Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64');

          // Actualizar el título del post
          const updateResponse = await fetch(wpEndpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify({
              title: `Preliminary Analysis: ${iaDescription}`, // Concatenamos el prefijo con la descripción
            }),
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`[update-pending-appraisal] Error actualizando título del post en WordPress: ${errorText}`);
            // Manejar el error según sea necesario
          } else {
            console.log('Título del post de WordPress actualizado exitosamente con la descripción generada.');
          }
        } catch (error) {
          console.error('Error actualizando el título del post en WordPress:', error);
          // Manejar el error según sea necesario
        }

        // Guardar los datos en el spreadsheet, y obtener 'customer_name' de columna E basándose en session_id (columna C)
        try {
          // Encontrar la fila en Google Sheets que coincide con el session_id
          const spreadsheetId = config.PENDING_APPRAISALS_SPREADSHEET_ID;
          const sheetName = config.GOOGLE_SHEET_NAME;

          const responseSheets = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:O`, // Obtener columnas A hasta O
          });

          const values = responseSheets.data.values || [];
          let rowIndex = null;

          for (let i = 0; i < values.length; i++) {
            const rowSessionId = values[i][2]; // session_id en columna C (índice 2)
            if (rowSessionId === session_id) {
              rowIndex = i + 1; // Las filas en Sheets comienzan en 1
              customer_name = values[i][4] || ''; // customer_name en columna E (índice 4)
              break;
            }
          }

          if (rowIndex === null) {
            console.error(`Cloud Run: No se encontró el session_id ${session_id} en Google Sheets.`);
            return;
          }

          // Loguear el nombre del cliente obtenido
          console.log(`Cloud Run: Nombre del cliente obtenido de Google Sheets: ${customer_name}`);

          // Convertir el array de imágenes a una cadena JSON
          const imagesString = JSON.stringify(images);

          // Escribir la descripción generada por IA en la columna H
          const descriptionRange = `${sheetName}!H${rowIndex}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: descriptionRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [[iaDescription]],
            },
          });
          console.log(`Cloud Run: Descripción generada por IA guardada en la fila ${rowIndex}, columna H.`);

          // Escribir la descripción del cliente en la columna I (si existe)
          const clientDescriptionRange = `${sheetName}!I${rowIndex}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: clientDescriptionRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [[description || '']],
            },
          });
          console.log(`Cloud Run: Descripción del cliente guardada en la fila ${rowIndex}, columna I.`);

          // Escribir el array de imágenes en la columna O
          const imagesRange = `${sheetName}!O${rowIndex}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: imagesRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [[imagesString]],
            },
          });
          console.log(`Cloud Run: Array de imágenes guardado en la fila ${rowIndex}, columna O.`);
        } catch (error) {
          console.error('Error guardando datos en Google Sheets:', error);
          // Manejar el error según sea necesario
        }

        // Enviar email al cliente con la descripción
        try {
          sendGridMail.setApiKey(config.SENDGRID_API_KEY);

          const currentYear = new Date().getFullYear();

          const delayInMinutes = 1; // Retraso de 1 minuto
          const sendAtTimestamp = Math.floor((Date.now() + (delayInMinutes * 60 * 1000)) / 1000); // Convertir a segundos

          const emailContent = {
            to: customer_email,
            from: config.SENDGRID_EMAIL, // Verified email
            templateId: config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE, // Asegúrate de usar el template ID correcto
            dynamic_template_data: {
              customer_name: customer_name,
              description: description || '',
              preliminary_description: iaDescription, // Aquí asignamos iaDescription a preliminary_description
              customer_email: customer_email,
              current_year: currentYear,
            },
            // Programar el email para que se envíe con un retraso
            sendAt: sendAtTimestamp, // Retraso de 1 minuto
          };

          await sendGridMail.send(emailContent);
          console.log(`Email programado exitosamente para enviar a ${customer_email} con la descripción.`);
        } catch (error) {
          console.error('Error enviando email al cliente:', error);
          // Manejar el error según sea necesario
        }

        // Continuar con otras operaciones si es necesario

      } catch (error) {
        console.error('Cloud Run: Error en /api/update-pending-appraisal:', error);
        // Manejar errores si es necesario
      }
    })();
  } catch (error) {
    console.error('Cloud Run: Error en /api/update-pending-appraisal:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};
