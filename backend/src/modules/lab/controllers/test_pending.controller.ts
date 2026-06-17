import { Request, Response } from 'express'
import { LabPendingInventoryItem } from '../models/PendingInventoryItem'

export async function testPendingReview(req: Request, res: Response) {
  try {
    console.log('🧪 Testing Pending Review System...')
    
    // Test 1: Create a test pending item
    const testItem = await LabPendingInventoryItem.create({
      name: 'TEST ITEM - DELETE ME',
      quantity: 999,
      unit: 'test',
      price: 1,
      supplier: 'Test Supplier',
      purchaseOrderId: 'test123',
      purchaseOrderNumber: 'TEST-PO-123',
      purchaseOrderDate: new Date().toISOString(),
      status: 'pending'
    })
    
    console.log('✅ Test item created:', testItem._id)
    
    // Test 2: Count all pending items
    const count = await LabPendingInventoryItem.countDocuments({ status: 'pending' })
    console.log(`✅ Total pending items: ${count}`)
    
    // Test 3: List all pending items
    const items = await LabPendingInventoryItem.find({ status: 'pending' }).limit(10).lean()
    console.log(`✅ Found ${items.length} pending items`)
    
    res.json({
      success: true,
      message: 'Pending Review system is working!',
      testItemId: testItem._id,
      totalPendingItems: count,
      sampleItems: items.map((i: any) => ({
        id: i._id,
        name: i.name,
        quantity: i.quantity,
        supplier: i.supplier,
        poNumber: i.purchaseOrderNumber
      }))
    })
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}

export async function cleanupTest(req: Request, res: Response) {
  try {
    const result = await LabPendingInventoryItem.deleteMany({ 
      name: 'TEST ITEM - DELETE ME' 
    })
    res.json({ success: true, deleted: result.deletedCount })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
}
