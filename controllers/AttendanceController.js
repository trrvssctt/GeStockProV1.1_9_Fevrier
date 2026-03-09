import { Attendance } from '../models/index.js';

export class AttendanceController {
  static async list(req, res) {
    try {
      const items = await Attendance.findAll({ where: { tenantId: req.user.tenantId } });
      return res.status(200).json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const payload = { ...req.body, tenantId: req.user.tenantId };
      const item = await Attendance.create(payload);
      return res.status(201).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const item = await Attendance.findOne({ where: { id, tenantId: req.user.tenantId } });
      if (!item) return res.status(404).json({ error: 'NotFound' });
      await item.update(req.body);
      return res.status(200).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}
