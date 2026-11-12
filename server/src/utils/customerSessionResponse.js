import CustomerProfile from "../models/customer/customer.model.js";

export async function enrichCustomerSessionResponse(ctx) {
  const response = ctx.context.returned;
  if (!response?.user) {
    return;
  }

  const profile = await CustomerProfile.findOne({ authUserId: response.user.id }).lean();
  const { emailVerified: _emailVerified, ...user } = response.user;

  return {
    ...response,
    user: {
      ...user,
      addresses: profile?.addresses ?? [],
    },
  };
}
