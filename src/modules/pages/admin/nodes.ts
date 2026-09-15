import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Admin Nodes Page",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/admin/nodes",
      isAuthenticated(true, "airlink.admin.nodes.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/nodes");
          res.render("admin/nodes/nodes", {
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
      "/admin/nodes/list",
      isAuthenticated(true, "airlink.admin.nodes.view"),
      async (req, res, next) => {
        try {
          const nodes = await apiGet(req, "/api/v2/admin/nodes");
          res.json(nodes);
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/nodes/create",
      isAuthenticated(true, "airlink.admin.nodes.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/nodes/create");
          res.render("admin/nodes/create", {
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
      "/admin/nodes/create",
      isAuthenticated(true, "airlink.admin.nodes.create"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/nodes", req.body);
          res.status(200).json({ message: "Node created successfully." });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/node/:id",
      isAuthenticated(true, "airlink.admin.nodes.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/nodes/${req.params.id}`,
          );
          res.render("admin/nodes/edit", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    router.put(
      "/admin/node/:id/edit",
      isAuthenticated(true, "airlink.admin.nodes.update"),
      async (req, res, next) => {
        try {
          await apiPut(req, `/api/v2/admin/nodes/${req.params.id}`, req.body);
          res.status(200).json({ message: "Node updated successfully." });
        } catch (err) {
          next(err);
        }
      },
    );

    router.delete(
      "/admin/node/:id",
      isAuthenticated(true, "airlink.admin.nodes.delete"),
      async (req, res, next) => {
        try {
          await apiDelete(req, `/api/v2/admin/nodes/${req.params.id}`);
          res.status(200).json({ message: "Node deleted successfully." });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/node/:id/configure",
      isAuthenticated(true, "airlink.admin.nodes.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/nodes/${req.params.id}/configure`,
          );
          res.status(200).json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/node/:id/stats",
      isAuthenticated(true, "airlink.admin.nodes.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/nodes/${req.params.id}/stats`,
          );
          res.render("admin/nodes/stats", {
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
      "/admin/node/:id/stats/live",
      isAuthenticated(true, "airlink.admin.nodes.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/nodes/${req.params.id}/stats/live`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/node/:id/maintenance",
      isAuthenticated(true, "airlink.admin.nodes.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/nodes/${req.params.id}/maintenance`,
            req.body,
          );
          res.status(200).json({ message: "Node maintenance mode updated." });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/node/:id/verify",
      isAuthenticated(true, "airlink.admin.nodes.view"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/admin/nodes/${req.params.id}/verify`,
            req.body,
          );
          res.status(200).json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
