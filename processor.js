// processor.js

const { PubSub } = require('@google-cloud/pubsub');
const { initializeSheets } = require('./sheets');
const { config, initializeConfig } = require('./config');
const appraisalStepsModule = require('./appraisalSteps');

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

    // Nombre de la suscripción (asegúrate de que exista en Pub/Sub)
    const subscriptionName = 'appraisal-tasks-subscription'; // Debes crear esta suscripción

    const subscription = pubsub.subscription(subscriptionName);

    // Función para manejar cada mensaje
    const messageHandler = async (message) => {
      console.log(`Received message: ${message.id}`);
      const data = JSON.parse(message.data.toString());
      const { id, appraisalValue, description } = data;

      try {
        console.log(`[processor.js] Processing appraisal task for id: ${id}`);

        await appraisalSteps.setAppraisalValue(id, appraisalValue, description);
        await appraisalSteps.mergeDescriptions(id, description);
        await appraisalSteps.updatePostTitle(id);
        await appraisalSteps.insertTemplate(id);
        await appraisalSteps.buildPDF(id);
        await appraisalSteps.sendEmailToCustomer(id);
        await appraisalSteps.markAppraisalAsCompleted(id, appraisalValue, description);

        console.log(`[processor.js] Completed appraisal task for id: ${id}`);
        message.ack(); // Acknowledge el mensaje
      } catch (error) {
        console.error(`[processor.js] Error processing appraisal task for id: ${id}:`, error);
        message.nack(); // Reintentar el mensaje
      }
    };

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
