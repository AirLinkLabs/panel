import { Router } from "express";
import {
  isAuthenticatedForServer,
  requireSubUserPermission,
} from "../../../../handlers/utils/auth/serverAuthUtil";
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from "../../../../handlers/internalApiClient";
import type { Module } from "../../../../handlers/moduleInit";

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

    // WebSocket token
    router.get(
      "/server/:id/ws-token",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("console"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, `/servers/${req.params.id}/ws-token`);
          res.json(data);
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
          const serverRes = (await apiGet(
            req,
            `/servers/${req.params.id}`,
          )) as any;
          res.render("user/server/console", {
            server: serverRes.data || serverRes,
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
            `/servers/${req.params.id}/console/logs`,
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
          const backupsRes = (await apiGet(
            req,
            `/servers/${req.params.id}/backups`,
          )) as any;
          res.render("user/server/backups", {
            backups: backupsRes.data || [],
            server: { UUID: req.params.id },
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
            `/servers/${req.params.id}/backups`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Backup delete
    router.delete(
      "/server/:id/backups/:backupId",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const result = await apiDelete(
            req,
            `/servers/${req.params.id}/backups/${req.params.backupId}`,
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
            `/servers/${req.params.id}/backups/${req.params.backupId}/restore`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // Backup lock toggle
    router.patch(
      "/server/:id/backups/:backupId/lock",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const result = await apiPatch(
            req,
            `/servers/${req.params.id}/backups/${req.params.backupId}/lock`,
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
            `/servers/${req.params.id}/backups/${req.params.backupId}/download`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    // Backup progress
    router.get(
      "/server/:id/backups/progress",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/servers/${req.params.id}/backups/progress`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    // Restore progress
    router.get(
      "/server/:id/backups/restore/progress",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("backups"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/servers/${req.params.id}/backups/restore/progress`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    // SFTP credentials — GET
    router.get(
      "/server/:id/sftp/credentials",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files.sftp"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, `/servers/${req.params.id}/sftp`);
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    // SFTP credentials — POST (generate)
    router.post(
      "/server/:id/sftp/credentials",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files.sftp"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/servers/${req.params.id}/sftp`,
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // SFTP credentials — DELETE
    router.delete(
      "/server/:id/sftp/credentials",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files.sftp"),
      async (req, res, next) => {
        try {
          const result = await apiDelete(req, `/servers/${req.params.id}/sftp`);
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    // SFTP activity
    router.get(
      "/server/:id/sftp/activity",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files.sftp"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/servers/${req.params.id}/sftp/activity`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    // SFTP page
    router.get(
      "/server/:id/sftp",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("files.sftp"),
      async (req, res, next) => {
        try {
          const sftpRes = (await apiGet(
            req,
            `/servers/${req.params.id}/sftp`,
          )) as any;
          res.render("user/server/sftp", {
            sftp: sftpRes.data || sftpRes,
            server: { UUID: req.params.id },
            user: req.session?.user,
            req,
          });
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

    // Players page
    router.get(
      "/server/:id/players",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("console"),
      async (req, res, next) => {
        try {
          const playersRes = (await apiGet(
            req,
            `/servers/${req.params.id}/players`,
          )) as any;
          res.render("user/server/players", {
            players: playersRes.data || [],
            server: { UUID: req.params.id },
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    // Players data (JSON for AJAX refresh)
    router.get(
      "/server/:id/players/data",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("console"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, `/servers/${req.params.id}/players`);
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    // Worlds
    router.get(
      "/server/:id/worlds",
      isAuthenticatedForServer("id"),
      requireSubUserPermission("console"),
      async (req, res, next) => {
        try {
          const worldsRes = (await apiGet(
            req,
            `/servers/${req.params.id}/worlds`,
          )) as any;
          res.render("user/server/worlds", {
            worlds: worldsRes.data || [],
            server: { UUID: req.params.id },
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
      requireSubUserPermission("console"),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            `/servers/${req.params.id}/worlds/${req.params.worldId}/${req.params.action}`,
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
      requireSubUserPermission("settings"),
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
      requireSubUserPermission("settings"),
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
      requireSubUserPermission("settings"),
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
      requireSubUserPermission("settings"),
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
      requireSubUserPermission("schedule.create"),
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
      requireSubUserPermission("schedule.create"),
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
      requireSubUserPermission("schedule.create"),
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
      requireSubUserPermission("schedule.create"),
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
      requireSubUserPermission("schedule.create"),
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
      requireSubUserPermission("database.create"),
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
      requireSubUserPermission("database.create"),
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
      requireSubUserPermission("database.create"),
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
      requireSubUserPermission("database.create"),
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
