import { useParams } from 'react-router-dom'
import Hospital_BirthCertificateForm from '../../../components/hospital/hospital_BirthCertificateForm'

export default function Hospital_BirthCertificateDetail(){
  const { id = '' } = useParams()

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold text-slate-800">Birth Certificate</div>
      <Hospital_BirthCertificateForm docId={String(id)} showPatientHeader={false} />
    </div>
  )
}
