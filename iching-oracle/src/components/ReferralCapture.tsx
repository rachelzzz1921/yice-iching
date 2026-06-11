import { useEffect } from "react";
import { captureReferralFromLocation } from "@/lib/referral-pending";

/** 挂载时捕获 ?ref= / ?invite= 邀请码，供后续注册归因 */
export function ReferralCapture() {
  useEffect(() => {
    captureReferralFromLocation();
  }, []);
  return null;
}
