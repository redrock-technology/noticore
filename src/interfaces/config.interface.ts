import * as admin from 'firebase-admin';

export type NotiCoreSmsToConfigType = {
  providerToken: string;
  url: string;
  number: string;
};

export type NotiCoreFCMConfigType = {
  serviceAccount: admin.ServiceAccount;
};

export type NotiCoreMailgunConfigType = {
  domain: string;
  from: string;
  key: string;
  ssl: boolean;
  logging: boolean;
};
