import { InternalServerErrorException, HttpStatus } from '@nestjs/common';

interface ServerExceptionOptions {
  information: {
    message: string;
    identifier: string;
  };
}

export class ServerException extends InternalServerErrorException {
  constructor(options: ServerExceptionOptions) {
    const { information } = options;

    super({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: information.message,
    });
  }
}

export class UnHandledServerException extends ServerException {
  constructor() {
    super({
      information: {
        message: 'server error',
        identifier: 'serverError.unhandled',
      },
    });
  }
}
