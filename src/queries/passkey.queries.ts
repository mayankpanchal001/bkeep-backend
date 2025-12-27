/**
 * Passkey Query Functions
 * Database operations for WebAuthn/FIDO2 passkey credentials
 */

import type {
  CreatePasskeyData,
  PasskeyStats,
  UpdatePasskeyData,
} from '@/types/passkey.type'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { PASSKEY_CREDENTIAL_TYPES } from '@constants/passkey'
import { UserPasskey } from '@models/UserPasskey'
import { ApiError } from '@utils/ApiError'
import { getCurrentISOString } from '@utils/date'

/**
 * Create a new passkey credential
 */
export const createPasskey = async (
  data: CreatePasskeyData
): Promise<UserPasskey> => {
  try {
    // Build the insert object with all provided fields
    const insertData = {
      userId: data.userId,
      credentialId: data.credentialId,
      publicKey: data.publicKey,
      counter: data.counter,
      credentialType: data.credentialType,
      name: data.name,
      backupEligible: data.backupEligible,
      backupState: data.backupState,
      isActive: true,
      ...(data.transports && { transports: data.transports }),
      ...(data.aaguid && { aaguid: data.aaguid }),
      ...(data.userAgent && { userAgent: data.userAgent }),
      ...(data.ipAddress && { ipAddress: data.ipAddress }),
    }

    const passkey = await UserPasskey.query().insert(insertData)

    return passkey
  } catch {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.PASSKEY_CREATION_FAILED
    )
  }
}

/**
 * Find passkey by ID
 */
export const findPasskeyById = async (
  id: string
): Promise<UserPasskey | undefined> => {
  return UserPasskey.query().modify('notDeleted').findById(id)
}

/**
 * Find passkey by credential ID
 */
export const findPasskeyByCredentialId = async (
  credentialId: string
): Promise<UserPasskey | undefined> => {
  return UserPasskey.findByCredentialId(credentialId)
}

/**
 * Find all active passkeys for a user
 */
export const findPasskeysByUserId = async (
  userId: string
): Promise<UserPasskey[]> => {
  return UserPasskey.findActiveByUser(userId)
}

/**
 * Count active passkeys for a user
 */
export const countPasskeysByUserId = async (
  userId: string
): Promise<number> => {
  return UserPasskey.countActiveByUser(userId)
}

/**
 * Update passkey data
 */
export const updatePasskey = async (
  id: string,
  data: UpdatePasskeyData
): Promise<UserPasskey> => {
  const passkey = await findPasskeyById(id)

  if (!passkey) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.PASSKEY_NOT_FOUND)
  }

  const updatedPasskey = await UserPasskey.query()
    .patchAndFetchById(id, {
      ...data,
      updatedAt: getCurrentISOString() as unknown as Date,
    })
    .modify('notDeleted')

  return updatedPasskey
}

/**
 * Update passkey counter (after successful authentication)
 */
export const updatePasskeyCounter = async (
  id: string,
  counter: number
): Promise<void> => {
  await UserPasskey.query()
    .findById(id)
    .patch({
      counter,
      lastUsedAt: getCurrentISOString() as unknown as Date,
      updatedAt: getCurrentISOString() as unknown as Date,
    })
}

/**
 * Update passkey last used timestamp
 */
export const updatePasskeyLastUsed = async (id: string): Promise<void> => {
  await UserPasskey.query()
    .findById(id)
    .patch({
      lastUsedAt: getCurrentISOString() as unknown as Date,
      updatedAt: getCurrentISOString() as unknown as Date,
    })
}

/**
 * Soft delete a passkey
 */
export const deletePasskey = async (
  id: string,
  userId: string
): Promise<UserPasskey> => {
  const passkey = await findPasskeyById(id)

  if (!passkey) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.PASSKEY_NOT_FOUND)
  }

  // Verify ownership
  if (passkey.userId !== userId) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN)
  }

  // Soft delete
  const deletedPasskey = await UserPasskey.query().patchAndFetchById(id, {
    deletedAt: getCurrentISOString() as unknown as Date,
    updatedAt: getCurrentISOString() as unknown as Date,
  })

  return deletedPasskey
}

/**
 * Deactivate a passkey (without deleting)
 */
export const deactivatePasskey = async (
  id: string,
  userId: string
): Promise<UserPasskey> => {
  const passkey = await findPasskeyById(id)

  if (!passkey) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.PASSKEY_NOT_FOUND)
  }

  // Verify ownership
  if (passkey.userId !== userId) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN)
  }

  return updatePasskey(id, { isActive: false })
}

/**
 * Activate a passkey
 */
export const activatePasskey = async (
  id: string,
  userId: string
): Promise<UserPasskey> => {
  const passkey = await findPasskeyById(id)

  if (!passkey) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.PASSKEY_NOT_FOUND)
  }

  // Verify ownership
  if (passkey.userId !== userId) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN)
  }

  return updatePasskey(id, { isActive: true })
}

/**
 * Rename a passkey
 */
export const renamePasskey = async (
  id: string,
  userId: string,
  name: string
): Promise<UserPasskey> => {
  const passkey = await findPasskeyById(id)

  if (!passkey) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.PASSKEY_NOT_FOUND)
  }

  // Verify ownership
  if (passkey.userId !== userId) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN)
  }

  return updatePasskey(id, { name })
}

/**
 * Get passkey statistics for a user
 */
export const getPasskeyStats = async (
  userId: string
): Promise<PasskeyStats> => {
  const passkeys = await findPasskeysByUserId(userId)

  // Find the most recent lastUsedAt timestamp
  let lastUsed: Date | undefined
  for (const p of passkeys) {
    if (p.lastUsedAt) {
      if (!lastUsed || p.lastUsedAt > lastUsed) {
        lastUsed = p.lastUsedAt
      }
    }
  }

  const stats: PasskeyStats = {
    total: passkeys.length,
    active: passkeys.filter((p) => p.isActive).length,
    platform: passkeys.filter(
      (p) => p.credentialType === PASSKEY_CREDENTIAL_TYPES.PLATFORM
    ).length,
    roaming: passkeys.filter(
      (p) => p.credentialType === PASSKEY_CREDENTIAL_TYPES.ROAMING
    ).length,
  }

  // Conditionally add lastUsed only if it has a value
  if (lastUsed) {
    stats.lastUsed = lastUsed
  }

  return stats
}
