import { Router } from 'express';
import { isAuthenticated } from '../../../handlers/utils/auth/authUtil';
import { apiGet, apiPost } from '../../../handlers/internalApiClient';
import type { Module } from '../../../handlers/moduleInit';

const module: Module = {
  info: {
    name: 'Admin Radar Page',
    version: '2.0.0',
    moduleVersion: '1.0.0',
    author: 'AirLinkLab',
    license: 'MIT',
    description: '',
  },
  router: () => {
    const router = Router();

    router.get(
      '/admin/radar',
      isAuthenticated(true, 'airlink.admin.radar.view'),
      async (req, res, next) => {
        try {
          const data: any = await apiGet(req, '/api/v2/admin/radar');
          res.render('admin/radar/index', {
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
      '/admin/radar/scripts',
      isAuthenticated(true, 'airlink.admin.radar.scripts.view'),
      async (req, res, next) => {
        try {
          const data: any = await apiGet(req, '/api/v2/admin/radar/scripts');
          res.render('admin/radar/scripts/index', {
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
      '/admin/radar/scripts/create',
      isAuthenticated(true, 'airlink.admin.radar.scripts.create'),
      async (req, res, next) => {
        try {
          const data: any = await apiGet(req, '/api/v2/admin/radar/scripts/create');
          res.render('admin/radar/scripts/create', {
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
      '/admin/radar/scripts/edit/:id',
      isAuthenticated(true, 'airlink.admin.radar.scripts.view'),
      async (req, res, next) => {
        try {
          const data: any = await apiGet(
            req,
            `/api/v2/admin/radar/scripts/${req.params.id}`,
          );
          res.render('admin/radar/scripts/edit', {
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
      '/admin/radar/virustotal',
      isAuthenticated(true, 'airlink.admin.radar.virustotal.view'),
      async (req, res, next) => {
        try {
          const data: any = await apiGet(req, '/api/v2/admin/radar/virustotal');
          res.render('admin/radar/virustotal/index', {
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
      '/admin/radar/virustotal/scan/:hash',
      isAuthenticated(true, 'airlink.admin.radar.virustotal.view'),
      async (req, res, next) => {
        try {
          const data: any = await apiGet(
            req,
            `/api/v2/admin/radar/virustotal/scan/${req.params.hash}`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      '/admin/radar/scripts',
      isAuthenticated(true, 'airlink.admin.radar.scripts.create'),
      async (req, res, next) => {
        try {
          await apiPost(req, '/api/v2/admin/radar/scripts', req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      '/admin/radar/scripts/:id',
      isAuthenticated(true, 'airlink.admin.radar.scripts.update'),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/radar/scripts/${req.params.id}`,
            req.body,
          );
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      '/admin/radar/scripts/:id/delete',
      isAuthenticated(true, 'airlink.admin.radar.scripts.delete'),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/radar/scripts/${req.params.id}/delete`,
            req.body,
          );
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      '/admin/radar/virustotal',
      isAuthenticated(true, 'airlink.admin.radar.virustotal.scan'),
      async (req, res, next) => {
        try {
          await apiPost(req, '/api/v2/admin/radar/virustotal', req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      '/admin/radar/virustotal/:hash',
      isAuthenticated(true, 'airlink.admin.radar.virustotal.scan'),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/radar/virustotal/${req.params.hash}`,
            req.body,
          );
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
