import type { InitData, PaymentStatusData } from 'orchestrator-pp-core';

export interface ContextManager {
  getContext: () => Readonly<Context>,

  setPaymentStatusData: (data: PaymentStatusData) => void,
  setInitData: (data: InitData) => void,
  setToken: (token: string) => void,
}

export interface Context {
  token: string,
  amount: number,
  currency: string,
  projectHash: string,
  paymentStatus: PaymentStatusData,
}
