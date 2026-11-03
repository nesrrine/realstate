import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { signPrivateUrls } from "../utils/signed-url";

/** Toutes les réponses de l'API : les liens vers les documents privés sont signés (valables 1 h). */
@Injectable()
export class SignPrivateUrlsInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((body) => signPrivateUrls(body)));
  }
}
