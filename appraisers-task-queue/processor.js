// processor.js

require('dotenv').config(); // Cargar variables de entorno desde .env

const express = require('express'); // Importar Express
const cors = require('cors'); // Importar CORS middleware
const { PubSub } = require('@google-cloud/pubsub');
const cookieParser = require('cookie-parser'); // Asegúrate de tener este middleware si lo usas
const { initializeSheets } = require('./shared/googleSheets'); // Ruta actualizada
const { config, initializeConfig } = require('./shared/config'); // Ruta actualizada
const appraisalStepsModule = require('./shared/appraisalSteps'); // Ruta actualizada

const app = express(); // Crear una sola instancia de Express

// **Configuración de CORS**
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // Origen permitido
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas
  credentials: true, // Permitir envío de credenciales (cookies, tokens, etc.)
  optionsSuccessStatus: 200, // Estado de éxito para solicitudes preflight
};

// **Aplicar el middleware de CORS antes de cualquier otra ruta o middleware**
app.use(cors(corsOptions));

// **Manejar solicitudes OPTIONS preflight**
app.options('*', cors(corsOptions));

// **Middlewares adicionales**
app.use(express.json()); // Parsear JSON
app.use(cookieParser()); // Parsear cookies si es necesario

async function main() {
  try {
    // Inicializar configuraciones
    await initializeConfig();
    const sheets = await initializeSheets();
    const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

    // Inicializar Pub/Sub
    const pubsub = new PubSub({
      projectId: config.GCP_PROJECT_ID,
    });

    // Nombre de la suscripción (debe existir en Pub/Sub)
    const subscriptionName = 'appraisal-tasks-subscription';
    const subscription = pubsub.subscription(subscriptionName);

    // **Endpoint de health check**
    app.get('/health', (req, res) => {
      res.status(200).send('OK');
    });

    // **Endpoint para recibir tareas**
    app.post('/api/tasks', async (req, res) => {
      const { appraisalId, appraisalValue, description } = req.body;

      // Validación de los campos requeridos
      if (!appraisalId || !appraisalValue || !description) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos.' });
      }

      try {
        // Lógica para encolar la tarea en Pub/Sub
        const dataBuffer = Buffer.from(JSON.stringify({ id: appraisalId, appraisalValue, description }));

        // Publicar el mensaje en Pub/Sub
        await pubsub.topic('appraisal-tasks').publish(dataBuffer);

        // Responder con éxito
        res.status(200).json({ success: true, message: 'Tarea encolada exitosamente.' });
      } catch (error) {
        console.error('Error encolando tarea:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
      }
    });

    // **Función para manejar los mensajes recibidos de Pub/Sub**
    async function messageHandler(message) {
      try {
        // Parsear el mensaje
        const data = JSON.parse(message.data.toString());
        console.log('Mensaje recibido:', data);

        const { id, appraisalValue, description } = data;

        // Validar los datos recibidos
        if (!id || !appraisalValue || !description) {
          throw new Error('Datos incompletos en el mensaje.');
        }

        // Lógica para procesar la apreciación
        await appraisalSteps.processAppraisal(id, appraisalValue, description);

        // Acknowledge del mensaje después de procesarlo exitosamente
        message.ack();
        console.log(`Mensaje procesado y reconocido: ${id}`);
      } catch (error) {
        console.error('Error procesando el mensaje:', error);
        // Opcional: puedes decidir no reconocer el mensaje para que se reintente
        // message.nack();
      }
    }

    // **Escuchar mensajes en la suscripción**
    subscription.on('message', messageHandler);

    subscription.on('error', (error) => {
      console.error('Error en la suscripción de Pub/Sub:', error);
    });

    console.log('[processor.js] Listening for appraisal tasks...');

    // **Iniciar el servidor Express**
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Servidor backend corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error iniciando el procesador:', error);
    process.exit(1); // Salir con fallo
  }
}

main();
