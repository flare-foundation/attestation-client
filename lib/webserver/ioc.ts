import { IocContainerFactory } from "@tsoa/runtime";
import { Container } from "typescript-ioc";

const iocContainer: IocContainerFactory = (
  request: Request
) => {
  const container = Container;
  return container;
};

// export according to convention
export { iocContainer };
