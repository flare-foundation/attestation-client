import { Injectable } from '@nestjs/common';

@Injectable()
export class WsServerService {
  getHello(): string {
    return 'Hello World!';
  }
}
