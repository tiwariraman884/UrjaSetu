/**
 * Payment-to-task authorization bridge.
 * Calls the FastAPI backend to verify settlement and authorize the task.
 */
import axios from "axios";
import { config } from "../config";
import type { PaymentRecord } from "../types";

/**
 * Notify the backend that a payment has been settled.
 * The backend independently verifies and authorizes the task.
 */
export async function authorizeTask(
  paymentId: string,
  taskId: string,
  txId: string,
  paymentHeader: string,
  requirements: any
): Promise<{ authorized: boolean; error?: string }> {
  try {
    const resp = await axios.post(
      `${config.apiUrl}/api/v1/payments/verify`,
      {
        payment_id: paymentId,
        x_payment_header: paymentHeader,
        payment_requirements: requirements,
        tx_id: txId,
        task_id: taskId,
      },
      { timeout: 15000 }
    );
    return { authorized: resp.data.status === "settled" };
  } catch (err: any) {
    return {
      authorized: false,
      error: err?.response?.data?.detail || err?.message || "backend authorization failed",
    };
  }
}

/**
 * Get the optimization result from the backend for an authorized task.
 */
export async function getOptimization(taskId: string): Promise<any> {
  try {
    const resp = await axios.get(`${config.apiUrl}/api/v1/tasks/${taskId}`, {
      timeout: 10000,
    });
    return resp.data;
  } catch {
    return null;
  }
}
