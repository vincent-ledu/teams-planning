import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { I18n } from "i18n";
import path from "path";
import swaggerUi from "swagger-ui-express";
import Logger from "./utils/logger";
import KnexInitializer from "./utils/KnexInitializer";
import dbConfig, { DbType } from "./utils/DbConfig";
import { HomeRoute } from "./routes/HomeRoute";

dotenv.config();

export interface App {
  stop: () => Promise<void>;
}
const isInTest = process.env.NODE_ENV === "TEST";
if (!isInTest) {
  startApp().then(() => {
    Logger.info("Server started");
  });
}

export async function startApp(): Promise<App> {
  const app = express();
  app.set("view engine", "ejs");
  app.use(express.static("public"));

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: "/swagger.json",
      },
    })
  );
  const i18n = new I18n();
  i18n.configure({
    locales: ["en", "fr"],
    directory: path.join(__dirname, "../locales"),
    defaultLocale: "en",
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(i18n.init);

  //#region Database
  const databaseConfig = dbConfig();
  const knexInitializer = new KnexInitializer(databaseConfig);
  const knex = knexInitializer.getKnexInstance();
  //#endregion
  //#region Services
  // declare service
  if (
    !isInTest &&
    databaseConfig.dbType === DbType.MYSQL &&
    knex !== undefined
  ) {
    await knexInitializer.migrate();
    // vaultService = new KdbxVaultService(knex);
    // encryptService = new AES256EncryptServiceMySQL(knex);
  } else {
    // vaultService = new KdbxVaultService(undefined);
    // encryptService = new AES256EncryptServiceFile(process.env.DATA_DIR);
  }
  //#endregion
  //#region Routes
  let homeRoute: HomeRoute;
  homeRoute = new HomeRoute();

  app.use("/", homeRoute.router);
  //#endregion
  Logger.info(`Loading ${process.env.NODE_ENV} configuration`);
  const PORT = process.env.SERVER_PORT
    ? parseInt(process.env.SERVER_PORT, 10)
    : 3000;

  const server = app.listen(PORT, () => {
    Logger.info(`App listening on port ${PORT}!`);
  });
  const stopApp = async (): Promise<void> => {
    Logger.info(`Stopping server on port ${PORT}`);
    await server.close();
    await knex?.destroy();
  };

  module.exports = server;
  return {
    stop: stopApp,
  };
}
