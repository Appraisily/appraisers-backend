// processor.js.

require('dotenv').config(); // Cargar variables de entorno desde .env

const { PubSub } = require('@google-cloud/pubsub');
const { initializeSheets } = require('./shared/googleSheets'); // Ruta actualizada
const { config, initializeConfig } = require('./shared/config'); // Ruta actualizada
const appraisalStepsModule = require('./shared/appraisalSteps'); // Ruta actualizada




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

    // Función para manejar cada mensaje
    const messageHandler = async (message) => {
      console.log(`[processor.js] [Task ID: ${message.id}] Received message: ${message.id}`);
      const data = JSON.parse(message.data.toString());
      const { id, appraisalValue, description } = data;

      try {
        console.log(`[processor.js] [Task ID: ${id}] Starting appraisal processing.`);

        await appraisalSteps.setAppraisalValue(id, appraisalValue, description);
        console.log(`[processor.js] [Task ID: ${id}] setAppraisalValue completed.`);

        await appraisalSteps.mergeDescriptions(id, description);
        console.log(`[processor.js] [Task ID: ${id}] mergeDescriptions completed.`);

        await appraisalSteps.updatePostTitle(id);
        console.log(`[processor.js] [Task ID: ${id}] updatePostTitle completed.`);

        await appraisalSteps.insertTemplate(id);
        console.log(`[processor.js] [Task ID: ${id}] insertTemplate completed.`);

        await appraisalSteps.buildPDF(id);
        console.log(`[processor.js] [Task ID: ${id}] buildPDF completed.`);

        await appraisalSteps.sendEmailToCustomer(id);
        console.log(`[processor.js] [Task ID: ${id}] sendEmailToCustomer completed.`);

        await appraisalSteps.markAppraisalAsCompleted(id, appraisalValue, description);
        console.log(`[processor.js] [Task ID: ${id}] markAppraisalAsCompleted completed.`);

        console.log(`[processor.js] [Task ID: ${id}] Completed appraisal task successfully.`);
        message.ack(); // Acknowledge el mensaje
      } catch (error) {
        console.error(`[processor.js] [Task ID: ${id}] Error processing appraisal task:`, error);
        message.nack(); // Reintentar el mensaje
      }
    };

        // Start the server and listen on the specified port
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[processor.js] HTTP server listening on port ${PORT}`);
      console.log('[processor.js] Listening for appraisal tasks...');
    });

    // Escuchar mensajes
    subscription.on('message', messageHandler);

    subscription.on('error', (error) => {
      console.error('Error en la suscripción de Pub/Sub:', error);
    });

    console.log('[processor.js] Listening for appraisal tasks...');
  } catch (error) {
    console.error('Error iniciando el procesador:', error);
    process.exit(1);
  }
}

main();
