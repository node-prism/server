import { NextFunction, Request, Response } from "express";

export default class Context {
  req: Request;
  res: Response;
  next: NextFunction;

  constructor(req: Request, res: Response, next: NextFunction) {
    this.req = req;
    this.res = res;
    this.next = next;
  }
}
