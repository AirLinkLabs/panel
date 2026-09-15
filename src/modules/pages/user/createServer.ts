import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import { apiGet, apiPost } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "User Create Server",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/create-server",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/user/servers/create");
          res.render("user/create-server", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/create-server",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/user/servers", req.body);
          res.redirect("/dashboard");
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
