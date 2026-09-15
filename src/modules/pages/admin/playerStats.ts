import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import { apiGet, apiPost } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Admin Player Stats Page",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/admin/playerstats",
      isAuthenticated(true, "airlink.admin.playerstats.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/playerstats");
          res.render("admin/playerstats/playerstats", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/playerstats/search",
      isAuthenticated(true, "airlink.admin.playerstats.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/playerstats/search");
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/playerstats/lookup",
      isAuthenticated(true, "airlink.admin.playerstats.view"),
      async (req, res, next) => {
        try {
          const data = await apiPost(
            req,
            "/api/v2/admin/playerstats/lookup",
            req.body,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
