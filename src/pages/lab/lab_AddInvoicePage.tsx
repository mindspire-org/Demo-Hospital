import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Lab_AddInvoice from '../../components/lab/lab_AddInvoice'

export default function Lab_AddInvoicePage() {
  const navigate = useNavigate()
  const params = useParams()
  const [open, setOpen] = useState(true)
  
  const handleClose = () => {
    setOpen(false)
    navigate('/lab/inventory')
  }

  // Re-open if params change (edit mode)
  useEffect(() => {
    setOpen(true)
  }, [params.id])

  return (
    <div className="p-4">
      <Lab_AddInvoice open={open} onClose={handleClose} />
    </div>
  )
}
