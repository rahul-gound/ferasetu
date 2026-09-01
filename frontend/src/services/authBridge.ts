type UnauthorizedContext = {
  url: string;
  status: number;
  error: unknown;
};

type UnauthorizedHandler = (context: UnauthorizedContext) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export let getWorkOSToken: () => Promise<string | null> = async () => null;

export function setWorkOSTokenGetter(getter: () => Promise<string | null>) {
  getWorkOSToken = getter;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(context: UnauthorizedContext) {
  unauthorizedHandler?.(context);
}
