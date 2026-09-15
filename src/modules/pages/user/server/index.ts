import { Router } from "express";
import {
  isAuthenticatedForServer,
  requireSubUserPermission,
} from "../../../handlers/utils/auth/serverAuthUtil";
import { apiGet, apiPost } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "User Server Pages",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: (applyWs) => {
    const router = Router();

    // Server management page
    router.get(
      "/server/:id",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("console"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}`,
          );
          res.render("user/server/manage", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Server power actions
    router.post(
      "/server/:id/power/:poweraction",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("console"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/power/${req.params.poweraction}`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Console
    router.get(
      "/server/:id/console",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("console"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/console`,
          );
          res.render("user/server/console", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Console logs
    router.get(
      "/server/:id/console/logs",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("console"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/console/logs`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    // Files
    router.get(
      "/server/:id/files",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/files`,
          );
          res.render("user/server/files", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // File detail
    router.get(
      "/server/:id/files/detail",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/files/detail`,
          );
          res.render("user/server/file-detail", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // File actions (create, delete, rename, move, copy, compress, decompress)
    router.post(
      "/server/:id/files/action",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/files/action`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // File content read/write
    router.post(
      "/server/:id/files/content",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/files/content`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // File download
    router.get(
      "/server/:id/files/download",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/files/download`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    // File upload
    router.post(
      "/server/:id/files/upload",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/files/upload`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Backups
    router.get(
      "/server/:id/backups",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/backups`,
          );
          res.render("user/server/backups", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Backup create
    router.post(
      "/server/:id/backups/create",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/backups/create`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Backup restore
    router.post(
      "/server/:id/backups/:backupId/restore",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/backups/${req.params.backupId}/restore`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Backup download
    router.get(
      "/server/:id/backups/:backupId/download",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/backups/${req.params.backupId}/download`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    // Backup delete
    router.post(
      "/server/:id/backups/:backupId/delete",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/backups/${req.params.backupId}/delete`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Backup schedule
    router.post(
      "/server/:id/backups/schedule",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/backups/schedule`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Settings
    router.get(
      "/server/:id/settings",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("settings"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/settings`,
          );
          res.render("user/server/settings", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Settings update
    router.post(
      "/server/:id/settings",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("settings"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/settings`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Startup
    router.get(
      "/server/:id/startup",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("settings"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/startup`,
          );
          res.render("user/server/startup", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Startup update
    router.post(
      "/server/:id/startup",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("settings"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/startup`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Players
    router.get(
      "/server/:id/players",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("players"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/players`,
          );
          res.render("user/server/players", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Player action
    router.post(
      "/server/:id/players/:playerId/:action",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("players"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/players/${req.params.playerId}/${req.params.action}`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Worlds
    router.get(
      "/server/:id/worlds",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("worlds"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/worlds`,
          );
          res.render("user/server/worlds", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // World action
    router.post(
      "/server/:id/worlds/:worldId/:action",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("worlds"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/worlds/${req.params.worldId}/${req.params.action}`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Subusers
    router.get(
      "/server/:id/subusers",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("subusers"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/subusers`,
          );
          res.render("user/server/subusers", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Subuser create
    router.post(
      "/server/:id/subusers",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("subusers"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/subusers`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Subuser update
    router.post(
      "/server/:id/subusers/:subuserId",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("subusers"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/subusers/${req.params.subuserId}`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Subuser delete
    router.post(
      "/server/:id/subusers/:subuserId/delete",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("subusers"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/subusers/${req.params.subuserId}/delete`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Schedules
    router.get(
      "/server/:id/schedules",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("schedules"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/schedules`,
          );
          res.render("user/server/schedules", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Schedule create
    router.post(
      "/server/:id/schedules",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("schedules"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/schedules`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Schedule update
    router.post(
      "/server/:id/schedules/:scheduleId",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("schedules"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/schedules/${req.params.scheduleId}`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Schedule delete
    router.post(
      "/server/:id/schedules/:scheduleId/delete",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("schedules"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/schedules/${req.params.scheduleId}/delete`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Schedule run
    router.post(
      "/server/:id/schedules/:scheduleId/run",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("schedules"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/schedules/${req.params.scheduleId}/run`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Databases
    router.get(
      "/server/:id/databases",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("databases"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/databases`,
          );
          res.render("user/server/databases", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Database create
    router.post(
      "/server/:id/databases",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("databases"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/databases`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Database delete
    router.post(
      "/server/:id/databases/:databaseId/delete",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("databases"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/databases/${req.params.databaseId}/delete`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Database rotate password
    router.post(
      "/server/:id/databases/:databaseId/rotate",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("databases"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/databases/${req.params.databaseId}/rotate`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Reinstall
    router.get(
      "/server/:id/reinstall",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("settings"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/user/servers/${req.params.id}/reinstall`,
          );
          res.render("user/server/reinstall", {
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
      "/server/:id/reinstall",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("settings"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/api/v2/user/servers/${req.params.id}/reinstall`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
