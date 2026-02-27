import {
  processRepository,
  ProcessFilter,
  CreateProcessDTO,
  UpdateProcessDTO,
} from "./process.repository";
import { IProcess } from "../../types";

/**
 * Custom error cho Service layer
 */
export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/**
 * Service Layer: Chứa toàn bộ business logic
 * - Validation nghiệp vụ
 * - Xử lý các trường hợp đặc biệt
 * - Gọi repository để thao tác database
 */
class ProcessService {
  /**
   * Lấy danh sách processes
   */
  async getAll(filter: ProcessFilter): Promise<IProcess[]> {
    return processRepository.findAll(filter);
  }

  /**
   * Lấy process theo ID
   * @throws ServiceError nếu không tìm thấy
   */
  async getById(id: string): Promise<IProcess> {
    const process = await processRepository.findById(id);

    if (!process) {
      throw new ServiceError("NOT_FOUND", "Không tìm thấy công đoạn", 404);
    }

    return process;
  }

  /**
   * Tạo process mới
   * - Kiểm tra trùng code
   * - Nếu code đã tồn tại nhưng inactive -> reactivate
   * @throws ServiceError nếu code đã tồn tại và active
   */
  async create(data: CreateProcessDTO): Promise<IProcess> {
    // Kiểm tra code đã tồn tại chưa
    const existing = await processRepository.findByCode(data.code);

    if (existing) {
      // Nếu đang active -> lỗi duplicate
      if (existing.active) {
        throw new ServiceError("DUPLICATE", "Mã công đoạn đã tồn tại", 400);
      }

      // Nếu inactive -> reactivate
      const reactivated = await processRepository.reactivate(
        existing._id.toString(),
        data,
      );
      return reactivated as IProcess;
    }

    // Tạo mới
    return processRepository.create(data);
  }

  /**
   * Cập nhật process
   * @throws ServiceError nếu không tìm thấy
   */
  async update(id: string, data: UpdateProcessDTO): Promise<IProcess> {
    const process = await processRepository.update(id, data);

    if (!process) {
      throw new ServiceError("NOT_FOUND", "Không tìm thấy công đoạn", 404);
    }

    return process;
  }

  /**
   * Xóa process (soft delete)
   * @throws ServiceError nếu không tìm thấy
   */
  async remove(id: string): Promise<void> {
    const process = await processRepository.softDelete(id);

    if (!process) {
      throw new ServiceError("NOT_FOUND", "Không tìm thấy công đoạn", 404);
    }
  }
}

// Export singleton instance
export const processService = new ProcessService();
