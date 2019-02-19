/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to the Alexa Skills Kit, you can say hello!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const HelloWorldIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
  },
  handle(handlerInput) {
    const speechText = 'Hello World!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const BuyPowerUpIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'BuyPowerUpIntent'
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const powerUpProduct = sessionAttributes.products.filter(product => product.referenceName === 'PowerUp')[0];

    return handlerInput.responseBuilder
      .addDirective(
        {
          type: "Connections.SendRequest",
          name: "Buy",
          payload: {
            InSkillProduct: {
              productId: powerUpProduct.productId,
            }
          },
          token: "correlationToken",
        }
      )
      .getResponse();
  }
}

const PostBuyConnectionsHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'Connections.Response' && (request.name === 'Buy' || request.name === 'Upsell');
  },
  handle(handlerInput) {

    // Preparing constants
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const offeredProductId = request.payload.productId;
    const offeredProduct = attributes.products.filter(product => product.productId === offeredProductId)[0];

    // Variables for response
    let speakOutput;
    let repromptOutput = 'hmm?';

    if (request.status.code === '200') {

      switch(request.payload.purchaseResult) {
        case 'ACCEPTED':
          speakOutput = `With ${offeredProduct.name} you can be invisible to no one.`
          break;
        case 'DECLINED':
          speakOutput = `You didn't want to buy ${offeredProduct.name}. What a shame.`;
          break;
        case 'ALREADY_PURCHASED':
          speakOutput = `${offeredProduct.name} grants you invisibility. But it also seems it makes you forget stuff.`;
          break;
        default:
          speakOutput = `Something weird happened. But thanks anyway for trying to give me money.`
          break
      }

      return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
    } else {
      // Something failed.
      console.log(`Connections.Response indicated failure. error: ${handlerInput.requestEnvelope.request.status.message}`);

      return handlerInput.responseBuilder
        .speak('There was an error handling your purchase request. Please try again or contact us for help.')
        .getResponse();
    }ƒ
  }
}

const ProductsCheckerInterceptor = {
  async process(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    if (request.session.new === true) {
      try {
        const locale = handlerInput.requestEnvelope.request.locale;
        const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        const result = await ms.getInSkillProducts(locale);
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.products = result.inSkillProducts;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      } catch (error) {
        console.log(`Error calling InSkillProducts API: ${error}`);
      }
    }
  }
}

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelloWorldIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    PostBuyConnectionsHandler
  )
  .addRequestInterceptors(
    ProductsCheckerInterceptor
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
