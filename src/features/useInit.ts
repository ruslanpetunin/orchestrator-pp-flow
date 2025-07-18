import {
  Language,
  useJwtToken,
  useTranslator,
  useCookies,
  PaymentStatus
} from 'orchestrator-pp-core'
import type { Api, EventManager, Translator } from 'orchestrator-pp-core';
import type { PaymentMethod, PaymentMethodFactory } from 'orchestrator-pp-payment-method';
import type { ContextManager } from './../types/context';
import type { EventMap } from './../types/event';
import type { PaymentStatusManager } from './../types/paymentStatus';

function makeTranslator(api: Api, eventManager: EventManager<EventMap>): Translator {
  const translator = useTranslator(api);

  translator.on(
    'languageChanged',
    (lang) => eventManager.emit('languageChanged', lang)
  );

  return translator;
}

async function askPaymentStatus(paymentStatusManager: PaymentStatusManager, eventManager: EventManager<EventMap>, token: string) {
  const cookies = useCookies();
  const alreadyStartedKey = 'opp_started_' + token.split('.').slice(-1)[0];

  // we wait for payment status result only if we now that user has already started payment
  if (cookies.get(alreadyStartedKey)) {
    await paymentStatusManager.request();
  } else {
    eventManager.on(
      'statusChanged',
      (context) => {
        if (context.paymentStatus.status !== PaymentStatus.NOT_STARTED) {
          cookies.set(alreadyStartedKey, '1', { expires: 1 });
        }
      }
    );

    paymentStatusManager.request().then(() => {});
  }
}

export default function(
  api: Api,
  contextManager: ContextManager,
  eventManager: EventManager<EventMap>,
  paymentStatusManager: PaymentStatusManager,
  paymentMethodFactory: PaymentMethodFactory
) {
  const context = contextManager.getContext();
  const translator = makeTranslator(api, eventManager);
  const paymentMethods: PaymentMethod[] = [];

  const init = async (token: string) => {
    const initData = useJwtToken(token);
    const [ projectSettings ] = await Promise.all([
      api.getProjectSettings(initData.project_hash),
      translator.setLanguage(Language.EN)
    ]);

    paymentMethods.push(
      ...(await paymentMethodFactory(initData, projectSettings))
    );

    contextManager.setInitData(initData);
    contextManager.setToken(token);

    await askPaymentStatus(paymentStatusManager, eventManager, token);

    eventManager.emit('init', context);
  }

  return {
    translator,
    paymentMethods,

    init
  };
}
