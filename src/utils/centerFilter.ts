// Collection Center Filtering Utility
// Filters data based on user's assigned collection centers

export interface CenterFilterable {
  collectionCenterId?: string
  collectionCenterName?: string
  centerId?: string
}

/**
 * Check if user has access to a specific collection center
 */
export function hasCenterAccess(
  userAssignedCenters: string[],
  itemCenterId: string | undefined,
  isAdmin: boolean = false
): boolean {
  // Admin can access all centers
  if (isAdmin) return true
  
  // If no centers assigned, allow all (for backwards compatibility)
  if (!userAssignedCenters || userAssignedCenters.length === 0) return true
  
  // If item has no center ID, allow (assume main lab)
  if (!itemCenterId) return true
  
  // Check if user's centers include the item's center
  return userAssignedCenters.includes(itemCenterId)
}

/**
 * Filter an array of items by collection center access
 */
export function filterByCenter<T extends CenterFilterable>(
  items: T[],
  userAssignedCenters: string[],
  isAdmin: boolean = false
): T[] {
  if (isAdmin) return items
  if (!userAssignedCenters || userAssignedCenters.length === 0) return items
  
  return items.filter(item => {
    const centerId = item.collectionCenterId || item.centerId
    if (!centerId) return true // Allow items without center (main lab)
    return userAssignedCenters.includes(centerId)
  })
}

/**
 * Get center filter params for API calls
 */
export function getCenterFilterParams(
  userAssignedCenters: string[],
  isAdmin: boolean = false
): { centerIds?: string } {
  if (isAdmin || !userAssignedCenters || userAssignedCenters.length === 0) {
    return {}
  }
  return { centerIds: userAssignedCenters.join(',') }
}

/**
 * Check if user can only see specific centers (not admin)
 */
export function isRestrictedToCenters(
  userAssignedCenters: string[],
  isAdmin: boolean = false
): boolean {
  return !isAdmin && userAssignedCenters && userAssignedCenters.length > 0
}

/**
 * Format center names for display
 */
export function formatCenterAccessMessage(
  userAssignedCenters: string[],
  centerNames: Record<string, string> = {}
): string {
  if (!userAssignedCenters || userAssignedCenters.length === 0) {
    return 'All Centers'
  }
  
  const names = userAssignedCenters.map(id => centerNames[id] || id)
  
  if (names.length === 1) {
    return names[0]
  }
  
  if (names.length <= 3) {
    return names.join(', ')
  }
  
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
}
