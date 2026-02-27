import Process from "./process.model";
import { IProcess } from "../../types";
import { FilterQuery } from "mongoose";

export interface ProcessFilter {
  vehicleTypeId?: string;
  active?: boolean;
}

export interface CreateProcessDTO {
  vehicleTypeId: string;
  name: string;
  code: string;
  order?: number;
  description?: string;
}

export interface UpdateProcessDTO {
  vehicleTypeId?: string;
  name?: string;
  code?: string;
  order?: number;
  description?: string;
  active?: boolean;
}

/**
 * Repository Layer: Chỉ thao tác với database
 * - Không chứa business logic
 * - Không biết về request/response
 */
class ProcessRepository {
  /**
   * Tìm tất cả processes theo filter
   */
  async findAll(filter: ProcessFilter = {}): Promise<IProcess[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: FilterQuery<any> = {};

    if (filter.vehicleTypeId) {
      query.vehicleTypeId = filter.vehicleTypeId;
    }

    if (filter.active !== undefined) {
      query.active = filter.active;
    } else {
      query.active = true; // Default: chỉ lấy active
    }

    return Process.find(query)
      .populate("vehicleTypeId", "name code")
      .sort({ order: 1 });
  }

  /**
   * Tìm process theo ID
   */
  async findById(id: string): Promise<IProcess | null> {
    return Process.findById(id).populate("vehicleTypeId", "name code");
  }

  /**
   * Tìm process theo code
   */
  async findByCode(code: string): Promise<IProcess | null> {
    return Process.findOne({ code });
  }

  /**
   * Tạo process mới
   */
  async create(data: CreateProcessDTO): Promise<IProcess> {
    const process = await Process.create({
      vehicleTypeId: data.vehicleTypeId,
      name: data.name,
      code: data.code,
      order: data.order || 0,
      description: data.description || "",
    });

    // Return với populated data
    return (await this.findById(process._id.toString())) as IProcess;
  }

  /**
   * Cập nhật process
   */
  async update(id: string, data: UpdateProcessDTO): Promise<IProcess | null> {
    return Process.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate("vehicleTypeId", "name code");
  }

  /**
   * Soft delete process
   */
  async softDelete(id: string): Promise<IProcess | null> {
    return Process.findByIdAndUpdate(id, { active: false }, { new: true });
  }

  /**
   * Reactivate process đã bị soft delete
   */
  async reactivate(
    id: string,
    data: CreateProcessDTO,
  ): Promise<IProcess | null> {
    return Process.findByIdAndUpdate(
      id,
      {
        vehicleTypeId: data.vehicleTypeId,
        name: data.name,
        order: data.order || 0,
        description: data.description || "",
        active: true,
      },
      { new: true, runValidators: true },
    ).populate("vehicleTypeId", "name code");
  }
}

// Export singleton instance
export const processRepository = new ProcessRepository();
