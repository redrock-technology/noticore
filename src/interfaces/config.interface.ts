import * as admin from 'firebase-admin';

export type SmsToConfigType = {
  providerToken: string;
  url: string;
  number: string;
};

export type FCMConfigType = {
  serviceAccount: admin.ServiceAccount;
};

export type MailgunConfigType = {
  domain: string;
  from: string;
  key: string;
  ssl: boolean;
  logging: boolean;
};
