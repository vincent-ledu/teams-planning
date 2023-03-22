import { Request, Response } from "express";
import { AController } from "./AController";

export class HomeController extends AController {
  constructor() {
    super();
  }
  home = (req: Request, res: Response): void => {
    res.status(200).render("pages/home", { stats: undefined });
  };
}
