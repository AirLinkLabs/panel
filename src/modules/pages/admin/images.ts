import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import {
  apiGet,
  apiPost,
  apiDelete,
} from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Admin Images Page",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/admin/images",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/images");
          res.render("admin/images/images", {
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
      "/admin/images/list",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/images/list");
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/images/edit/:id",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/images/${req.params.id}`,
          );
          res.render("admin/images/edit", {
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
      "/admin/images/edit/:id",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          await apiPost(req, `/api/v2/admin/images/${req.params.id}`, req.body);
          res.redirect(`/admin/images/edit/${req.params.id}?success=true`);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/images/create",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          const result = await apiPost(req, "/api/v2/admin/images", req.body);
          res.redirect(`/admin/images/edit/${(result as any).id}?success=true`);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/images/upload",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/images/upload", req.body);
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/images/import-url",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/images/import-url", req.body);
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/images/export/:id",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/images/${req.params.id}/export`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.delete(
      "/admin/images/delete/:id",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          await apiDelete(req, `/api/v2/admin/images/${req.params.id}`);
          res.status(200).send("Image deleted successfully.");
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/images/store",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          res.redirect("/admin/images#store");
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/images/store/panel",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          res.render("admin/images/store-panel");
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/images/store/catalogue",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            "/api/v2/admin/images/store/catalogue",
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/images/store/install",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/images/store/install", req.body);
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/images/store/refresh",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/images/store/refresh", {});
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/images/approvals",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          res.redirect("/admin/images#approvals");
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/images/approve/:id",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/images/${req.params.id}/approve`,
            req.body,
          );
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/images/reject/:id",
      isAuthenticated(true),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/images/${req.params.id}/reject`,
            req.body,
          );
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
