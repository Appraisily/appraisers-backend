// appraisers-task-queue/processor.js

require('dotenv').config(); // Load environment variables from .env

const express = require('express'); // Import Express
const cors = require('cors'); // Import CORS middleware
const { PubSub } = require('@google-cloud/pubsub');
const { initializeSheets } = require('./shared/googleSheets'); // Updated path
const { config, initializeConfig } = require('./shared/config'); // Updated path
const appraisalStepsModule = require('./shared/appraisalSteps'); // Updated path

async function main() {
  try {
    // Initialize configurations
    await initializeConfig();
    const sheets = await initializeSheets();
    const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

    // Función para manejar los mensajes recibidos de Pub/Sub
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

    // Initialize Pub/Sub
    const pubsub = new PubSub({
      projectId: config.GCP_PROJECT_ID,
    });

    // Name of the subscription (must exist in Pub/Sub)
    const subscriptionName = 'appraisal-tasks-subscription';
    const subscription = pubsub.subscription(subscriptionName);

    // Initialize Express app
    const app = express();
    const PORT = process.env.PORT || 8080;

    // Middleware para parsear JSON
    app.use(express.json());

    // Configurar CORS
    app.use(cors({
      origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // Reemplaza con el origen de tu frontend
      methods: ['POST', 'GET', 'OPTIONS'], // Métodos permitidos
      allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas
      credentials: true // Si necesitas enviar cookies o credenciales
    }));

    // Manejar solicitudes OPTIONS preflight
    app.options('*', cors());

    // Endpoint de health check
    app.get('/health', (req, res) => {
      res.status(200).send('OK');
    });

    // Endpoint para recibir tareas
    app.post('/api/tasks', async (req, res) => {
      const { appraisalId, appraisalValue, description } = req.body;

      // Validación de los campos requeridos
      if (!appraisalId || !appraisalValue || !description) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos.' });
      }

      try {
        // Lógica para encolar o procesar la tarea
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

    // Listen for messages
    subscription.on('message', messageHandler);

    subscription.on('error', (error) => {
      console.error('Error en la suscripción de Pub/Sub:', error);
    });

    console.log('[processor.js] Listening for appraisal tasks...');

    // Iniciar el servidor Express
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error iniciando el procesador:', error);
    process.exit(1); // Exit with failure
  }
}

main();
