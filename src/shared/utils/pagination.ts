/**
 * Pagination Utility
 * Standardizes calculation of skip/limit and formatting of paginated responses
 */

export interface PaginationOptions {
    page?: number | string;
    limit?: number | string;
}

export interface PaginatedResult<T> {
    success: true;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/**
 * Calculates skip and limit for MongoDB query
 */
export const getPaginationParams = (options: PaginationOptions) => {
    const page = Math.max(1, parseInt(options.page as string) || 1);
    const limit = Math.max(1, parseInt(options.limit as string) || 10);
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

/**
 * Formats data into a paginated response
 */
export const formatPaginatedResponse = (
    data: any[],
    total: number,
    page: number,
    limit: number,
    meta?: any,
) => {
    return {
        success: true,
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
        meta,
    };
};
