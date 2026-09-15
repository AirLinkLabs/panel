import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import { apiGet, apiPost } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Admin API Keys Page",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/admin/api/docs",
      isAuthenticated(true, "airlink.admin.api.docs.view"),
      async (req, res, next) => {
        try {
          res.redirect("/admin/apikeys");
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/apikeys",
      isAuthenticated(true, "airlink.admin.apikeys.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/apikeys");
          res.render("admin/apikeys/apikeys", {
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
      "/admin/apikeys/create",
      isAuthenticated(true, "airlink.admin.apikeys.create"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/apikeys", req.body);
          res.redirect("/admin/apikeys");
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/apikeys/delete/:id",
      isAuthenticated(true, "airlink.admin.apikeys.delete"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/apikeys/${req.params.id}/delete`,
            req.body,
          );
          res.redirect("/admin/apikeys");
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/apikeys/edit/:id",
      isAuthenticated(true, "airlink.admin.apikeys.edit"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/apikeys/${req.params.id}`,
            req.body,
          );
          res.redirect("/admin/apikeys");
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/apikeys/toggle/:id",
      isAuthenticated(true, "airlink.admin.apikeys.edit"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/apikeys/${req.params.id}/toggle`,
            req.body,
          );
          res.redirect("/admin/apikeys");
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
