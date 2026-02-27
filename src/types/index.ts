/**
 * =============================================
 * TYPES/INDEX.TS - Định nghĩa TypeScript Types
 * =============================================
 * Tập trung tất cả interfaces và types của ứng dụng
 * Đảm bảo type-safety trong toàn bộ codebase
 *
 * CÔNG TY CỔ PHẦN CÔNG NGHỆ XE ĐIỆN AI EBIKE
 */

import { Request } from "express";
import { Document, Types } from "mongoose";

// ==================== USER ====================

/**
 * Interface cho User (Người dùng)
 * Các vai trò:
 * - admin: Quản trị viên - toàn quyền
 * - supervisor: Giám sát - quản lý công nhân
 * - worker: Công nhân - thực hiện thao tác
 */
export interface IUser extends Document {
  _id: Types.ObjectId; // ID MongoDB
  name: string; // Họ tên
  code: string; // Mã nhân viên (dùng đăng nhập)
  email?: string; // Email (để reset password)
  password: string; // Mật khẩu (đã hash)
  role: "admin" | "supervisor" | "worker"; // Vai trò
  department?: string; // Phòng ban / Xưởng
  active: boolean; // Trạng thái hoạt động
  status: "pending" | "approved" | "rejected"; // Trạng thái tài khoản
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>; // So sánh mật khẩu
}

/**
 * Request đã có thông tin user (sau khi auth)
 */
export interface AuthRequest extends Request {
  user?: IUser;
}

// ==================== VEHICLE TYPE ====================

/**
 * Interface cho VehicleType (Loại xe)
 * Ví dụ: AIE MS1, M1 Sport, Bee U AI...
 */
export interface IVehicleType extends Document {
  _id: Types.ObjectId;
  name: string; // Tên loại xe
  code: string; // Mã loại xe
  description?: string; // Mô tả
  active: boolean;
}

// ==================== PROCESS ====================

/**
 * Interface cho Process (Công đoạn)
 * Là bước lớn trong quy trình sản xuất
 * Ví dụ: Lắp khung, Lắp động cơ...
 */
export interface IProcess extends Document {
  _id: Types.ObjectId;
  vehicleTypeId: Types.ObjectId; // Thuộc loại xe nào
  name: string; // Tên công đoạn
  code: string; // Mã công đoạn
  order: number; // Thứ tự
  description?: string;
  active: boolean;
}

// ==================== OPERATION ====================

/**
 * Interface cho Operation (Thao tác)
 * Là công việc cụ thể trong một công đoạn
 * Ví dụ: Lắp chân cổ, Bắn ốc khung...
 */
export interface IOperation extends Document {
  _id: Types.ObjectId;
  processId: Types.ObjectId | IProcess; // Thuộc công đoạn nào
  name: string; // Tên thao tác
  code: string; // Mã thao tác
  difficulty: number; // Độ khó (1-5)
  allowTeamwork: boolean; // Cho phép làm nhóm
  maxWorkers: number; // Số người tối đa
  standardQuantity: number; // Định mức số lượng
  standardMinutes: number; // Định mức thời gian
  workingMinutesPerShift: number; // Phút làm/ca
  instructions?: string; // Hướng dẫn
  description?: string;
  active: boolean;
}

// ==================== PRODUCTION STANDARD ====================

/**
 * Interface cho ProductionStandard (Định mức sản xuất)
 * Quy định: số lượng kỳ vọng, thưởng/phạt
 */
export interface IProductionStandard extends Document {
  _id: Types.ObjectId;
  vehicleTypeId: Types.ObjectId;
  operationId: Types.ObjectId;
  expectedQuantity: number; // Số lượng kỳ vọng
  bonusPerUnit: number; // Thưởng/đơn vị vượt
  penaltyPerUnit: number; // Phạt/đơn vị thiếu
  description?: string;
}

// ==================== PRODUCTION ORDER ====================

/**
 * Tiến độ từng công đoạn trong lệnh sản xuất
 */
export interface IProcessProgress {
  processId: Types.ObjectId;
  processName: string;
  requiredQuantity: number; // Số cần làm
  completedQuantity: number; // Số đã làm
  status: "pending" | "in_progress" | "completed";
}

/**
 * Lịch sử kiểm tra hoàn thành
 */
export interface ICompletionCheck {
  checkedAt: Date;
  checkedBy: Types.ObjectId;
  canComplete: boolean;
  incompleteProcesses: {
    processId: Types.ObjectId;
    processName: string;
    remaining: number;
  }[];
}

/**
 * Interface cho ProductionOrder (Lệnh sản xuất)
 */
export interface IProductionOrder extends Document {
  _id: Types.ObjectId;
  orderCode: string; // Mã lệnh
  vehicleTypeId: Types.ObjectId; // Loại xe
  quantity: number; // Số lượng
  frameNumbers: string[]; // Danh sách số khung
  engineNumbers: string[]; // Danh sách số máy
  startDate: Date; // Ngày bắt đầu
  expectedEndDate?: Date; // Ngày dự kiến hoàn thành
  actualEndDate?: Date; // Ngày hoàn thành thực tế
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdBy: Types.ObjectId;
  note?: string;
  processProgress: IProcessProgress[]; // Tiến độ
  completionChecks: ICompletionCheck[]; // Lịch sử kiểm tra
}

// ==================== SHIFT ====================

/**
 * Interface cho Shift (Ca làm việc)
 */
export interface IShift extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // Công nhân
  date: Date; // Ngày
  startTime: Date; // Giờ bắt đầu
  endTime?: Date; // Giờ kết thúc
  totalWorkingMinutes: number; // Tổng phút làm
  status: "active" | "completed" | "cancelled";
}

// ==================== DAILY REGISTRATION ====================

/**
 * Interface cho DailyRegistration (Đăng ký công việc)
 * Ghi nhận việc công nhân thực hiện thao tác
 */
export interface IDailyRegistration extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // Công nhân
  shiftId: Types.ObjectId; // Ca làm
  date: Date; // Ngày
  productionOrderId: Types.ObjectId; // Lệnh sản xuất
  operationId: Types.ObjectId; // Thao tác
  registeredAt: Date; // Thời điểm đăng ký
  status: "registered" | "in_progress" | "completed" | "reassigned";

  // Sản lượng
  actualQuantity?: number; // Thực tế
  expectedQuantity: number; // Kỳ vọng
  deviation: number; // Chênh lệch

  // Gián đoạn
  interruptionNote?: string;
  interruptionMinutes: number;

  // Thưởng/Phạt
  bonusAmount: number;
  penaltyAmount: number;

  // Điều chỉnh
  adjustedBy?: Types.ObjectId;
  adjustedExpectedQty?: number;
  adjustmentNote?: string;

  // Thời gian
  workingMinutes: number;
  checkInTime?: Date;
  checkOutTime?: Date;

  // Thay thế công nhân
  isReplacement: boolean;
  replacesUserId?: Types.ObjectId;
  replacementReason?: string;
  earlyLeaveReason?: string;
}

// ==================== DAILY REPORT ====================

/**
 * Interface cho DailyReport (Báo cáo ngày)
 * Tổng hợp kết quả làm việc
 */
export interface IDailyReport extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  shiftId: Types.ObjectId;
  date: Date;
  totalWorkingMinutes: number; // Phút làm thực tế
  totalStandardMinutes: number; // Phút quy đổi
  totalOperations: number; // Số thao tác
  efficiencyPercent: number; // Hiệu suất %
  bonusAmount: number; // Tổng thưởng
  penaltyAmount: number; // Tổng phạt
  finalResult: "bonus" | "penalty" | "neutral"; // Kết quả
}

// ==================== SETTINGS ====================

/**
 * Interface cho Settings (Cấu hình hệ thống)
 */
export interface ISettings extends Document {
  _id: Types.ObjectId;
  key: string; // Khóa cấu hình
  value: unknown; // Giá trị (có thể là object)
  description?: string;
  updatedBy?: Types.ObjectId;
}

// ==================== WORKLOG (Legacy) ====================

/**
 * Interface cho WorkLog (Nhật ký công việc - cũ)
 * Giữ lại để tương thích ngược
 */
export interface IWorkLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  shiftId: Types.ObjectId;
  processId: Types.ObjectId;
  operationId: Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  durationMinutes: number;
  standardMinutes: number;
  quantity: number;
  deviation: number;
  efficiency: number;
  status: "in_progress" | "completed" | "paused";
  note?: string;
}

// ==================== API RESPONSE ====================

/**
 * Cấu trúc response API chuẩn
 */
export interface ApiResponse<T = unknown> {
  success: boolean; // Thành công hay không
  data?: T; // Dữ liệu trả về
  message?: string; // Thông báo
  error?: {
    code: string; // Mã lỗi
    message: string; // Nội dung lỗi
  };
  count?: number; // Số lượng kết quả
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ==================== BONUS RULES ====================

/**
 * Cấu trúc quy tắc thưởng/phạt
 */
export interface BonusRules {
  excellent: { minEfficiency: number; bonusPercent: number }; // Xuất sắc
  good: { minEfficiency: number; bonusPercent: number }; // Tốt
  pass: { minEfficiency: number; bonusPercent: number }; // Đạt
  warning: { minEfficiency: number; bonusPercent: number }; // Cảnh báo
  penalty: { minEfficiency: number; penaltyPercent: number }; // Phạt
}
