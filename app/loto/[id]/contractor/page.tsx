"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Shield, 
  User, 
  Clock, 
  CheckCircle2, 
  Camera, 
  PenTool, 
  Plus, 
  Loader2, 
  ChevronRight,
  ChevronDown,
  Info,
  AlertTriangle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ContractorLock {
  id: string;
  taskId: string;
  contractorId: string;
  companyName: string;
  trade: string;
  description: string;
  contractorName: string;
  contractorPhone: string;
  lockOnSignature: string;
  lockOnPhoto: string;
  lockedOnAt: string;
  lockOffType: string | null;
  lockOffNote: string | null;
  lockedOffAt: string | null;
}

interface IsolationPoint {
  id: string;
  tagNo: number;
  isolationDescription: string;
  normalPosition: string;
  requiredPosition: string;
  lockNumber: string;
  isolationPosition: string;
  lockOnInitial1: string;
  lockOnInitial2: string;
}

interface LotoTask {
  id: string;
  lotoId: string;
  equipmentName: string;
  facility: string;
  status: string;
  reasonForIsolation: string;
  lockBoxNumber: string;
  primaryOperator?: { name: string };
  supervisor?: { name: string };
}

export default function ContractorPortal() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<LotoTask | null>(null);
  const [locks, setLocks] = useState<ContractorLock[]>([]);
  const [points, setPoints] = useState<IsolationPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // New: Company Selection
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const companies = ["Black Dreams Electrical Crew", "Apex Industrial Services", "Global Pipefitters Ltd", "Sunrise Safety Team"];

  // Form State for new crew member
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState({
    trade: "",
    description: "",
    printName: "",
    phone: "",
  });
  
  // Real-time Camera Logic
  const [showCamera, setShowCamera] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Digital Signature Logic (Now automatically derived from selfie)
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (!storedUser || !storedToken) {
        router.push("/login");
        return;
    }
    setCurrentUser(JSON.parse(storedUser));
    setToken(storedToken);
  }, [id, router]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [taskRes, locksRes] = await Promise.all([
        fetch(`/api/loto/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`/api/loto/${id}/contractor-lock`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);
      
      if (taskRes.ok) {
        const data = await taskRes.json();
        setTask(data.task);
        setPoints(data.isolationPoints || []);
      }
      if (locksRes.ok) setLocks(await locksRes.json());
    } catch (error) {
      toast.error("Failed to load task details");
    } finally {
      setIsLoading(false);
    }
  };

  // --- CAMERA METHODS ---
  const startCamera = async () => {
    setShowCamera(true);
    setSelfie(null);
    setSignature(null); // Clear previous sign if re-taking
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Camera access denied");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setSelfie(dataUrl);
      setSignature(dataUrl); // Selfie is the signature
      
      // Stop camera stream
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setShowCamera(false);
      toast.success("Verification complete. You have signed in.");
    }
  };


  // --- SUBMISSION ---
  const handleLockOn = async () => {
    if (!newRow.trade || !newRow.description || !newRow.printName || !selfie || !signature || !selectedCompany) {
      toast.error("All fields (including photo, signature, and company) are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/loto/${id}/contractor-lock`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newRow,
          companyName: selectedCompany,
          contractorName: newRow.printName,
          contractorPhone: newRow.phone,
          lockOnSignature: signature,
          lockOnPhoto: selfie,
          contractorId: currentUser?.id
        })
      });

      if (res.ok) {
        toast.success("LOCK ON successful!");
        setShowAddForm(false);
        setNewRow({ trade: "", description: "", printName: "", phone: "" });
        setSelfie(null);
        setSignature(null);
        fetchData();
      } else {
        toast.error("Failed to sign LOCK ON");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLockOff = async (lockId: string, type: string) => {
    if (type === "PENDING") return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/loto/${id}/contractor-lock`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ lockId, lockOffType: type })
      });

      if (res.ok) {
        toast.success("LOCK OFF submitted!");
        fetchData();
      } else {
        toast.error("Failed to sign LOCK OFF");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !task) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
           <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest animate-pulse">Initializing Portal...</p>
        </div>
      </div>
    );
  }

  // --- COMPANY SELECTION VIEW ---
  if (!selectedCompany) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 dark:bg-slate-950">
            <Card className="w-full max-w-md shadow-2xl border-none p-8 rounded-3xl">
                <div className="flex justify-center mb-6">
                    <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Shield className="h-8 w-8 text-white" />
                    </div>
                </div>
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Welcome to Contractor Portal</h1>
                    <p className="text-slate-500 font-medium">LOTO ID: <span className="text-blue-600 font-bold">{task.lotoId}</span></p>
                </div>
                
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Select Your Crew/Company</Label>
                        <select 
                            title="Select your company"
                            className="w-full h-12 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            defaultValue=""
                        >
                            <option value="" disabled>Choose your company...</option>
                            {companies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex gap-3 text-slate-500">
                            <Info className="h-5 w-5 text-blue-500 shrink-0" />
                            <p className="text-xs leading-relaxed">Selecting your company allows the system to route notifications and track your crew members correctly for this isolation task.</p>
                        </div>
                    </div>

                    <Button 
                        disabled={!selectedCompany} 
                        onClick={() => setSelectedCompany(selectedCompany)} // Effectively just triggers re-render
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-white shadow-lg shadow-blue-500/20"
                    >
                        START CONFIRMATION
                    </Button>
                </div>
            </Card>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-6 dark:bg-slate-900 shadow-sm">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-widest text-xs">
              <Shield className="h-4 w-4" />
              Contractor Portal
            </div>
            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-900">{currentUser?.name}</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">{selectedCompany}</span>
               </div>
               <Button variant="ghost" size="icon" onClick={() => router.push("/login")} className="text-slate-400 hover:text-red-500" title="Logout">
                  <X className="h-5 w-5" />
               </Button>
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Contractor Lock Confirmation – {task?.lotoId || "Loading..."}
          </h1>
          <p className="text-slate-500 font-medium">Equipment: <span className="text-slate-900 font-bold">{task?.equipmentName || "--"}</span> • Facility: <span className="text-slate-900 font-bold">{task?.facility || "--"}</span></p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 mt-8">
        
        {/* Isolation Safety Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2 border-none shadow-xl rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg font-bold">Isolation Safety Summary</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Reason for Isolation</Label>
                                <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    {task?.reasonForIsolation || "Not specified"}
                                </p>
                            </div>
                            <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1 block">Lock Box #</Label>
                                    <p className="text-xl font-black text-blue-900">{task?.lockBoxNumber || "--"}</p>
                                </div>
                                <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                    <Clock className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Verifying Personnel</Label>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Primary Operator</p>
                                        <p className="text-sm font-bold text-slate-900">{task?.primaryOperator?.name || "Mike Johnson"}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Verifying Supervisor</p>
                                        <p className="text-sm font-bold text-slate-900">{task?.supervisor?.name || "Lisa Chen"}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg font-bold">Isolation Points (Tags)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[250px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-black uppercase sticky top-0">
                                <tr>
                                    <th className="py-3 px-4">Tag</th>
                                    <th className="py-3 px-4">Location</th>
                                    <th className="py-3 px-4">Pos.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {points.map(pt => (
                                    <tr key={pt.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4 border-r border-slate-50">
                                            <span className="h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">{pt.tagNo}</span>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-700">{pt.isolationDescription}</td>
                                        <td className="py-3 px-4">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-black border border-blue-100 uppercase">{pt.requiredPosition}</span>
                                        </td>
                                    </tr>
                                ))}
                                {points.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-slate-400 font-bold italic">No isolation points found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Verification Status Banner */}
        <div className="mb-8 rounded-2xl bg-emerald-50 border border-emerald-100 p-6 flex items-start gap-4 shadow-sm">
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
                <h3 className="text-emerald-900 font-bold">LOTO Active & Verified</h3>
                <p className="text-emerald-700 text-sm font-medium mt-1">This equipment has been safely isolated and verified by operations. You may now proceed with your lock attachment and verification flow.</p>
            </div>
        </div>

        {/* Main Table Card */}
        <Card className="border-none shadow-xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-lg font-bold">Crew Tracking Table</CardTitle>
                   <CardDescription>Adding personnel for: <span className="text-blue-600 font-bold">{selectedCompany}</span></CardDescription>
                </div>
                {!showAddForm && (
                   <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-bold gap-2">
                      <Plus className="h-4 w-4" /> Add Crew Member
                   </Button>
                )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                    <th className="py-4 px-6 border-r border-slate-200">Date</th>
                    <th className="py-4 px-6 border-r border-slate-200">Trade</th>
                    <th className="py-4 px-6 border-r border-slate-200">Description of Lock</th>
                    <th className="py-4 px-6 border-r border-slate-200">Print Name</th>
                    <th className="py-4 px-6 border-r border-slate-200">LOCK ON (Signature)</th>
                    <th className="py-4 px-6">LOCK OFF (Initial)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locks.filter(l => l.companyName === selectedCompany).map(lock => (
                    <tr key={lock.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-5 px-6">
                        <div className="font-bold text-slate-900">{new Date(lock.lockedOnAt).toLocaleDateString()}</div>
                      </td>
                      <td className="py-5 px-6 font-bold text-slate-700">{lock.trade}</td>
                      <td className="py-5 px-6 text-slate-600 max-w-[200px] leading-relaxed italic">
                        "{lock.description}"
                      </td>
                      <td className="py-5 px-6">
                        <div className="font-extrabold text-blue-600">{lock.contractorName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{lock.contractorPhone}</div>
                      </td>
                      <td className="py-5 px-6">
                        {lock.lockOnSignature ? (
                          <div className="flex flex-col items-center">
                            <img src={lock.lockOnSignature} alt="Signature" className="h-10 object-contain mb-1 opacity-80" />
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                <Shield className="h-3 w-3" /> VERIFIED
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">Pending...</span>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        {lock.lockedOffAt ? (
                          <div className="flex flex-col items-center">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black ring-1 ring-slate-200">
                                {lock.lockOffType}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 font-bold">
                                {new Date(lock.lockedOffAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                             <select 
                                title="Select lock off type"
                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20"
                                onChange={(e) => handleLockOff(lock.id, e.target.value)}
                                defaultValue="PENDING"
                             >
                                <option value="PENDING" disabled>— Select —</option>
                                <option value="Self">Self</option>
                                <option value="Other">Other</option>
                                <option value="N/A">N/A</option>
                             </select>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Add Row Form Inline */}
                  {showAddForm && (
                     <tr className="bg-blue-50/30 animate-in fade-in slide-in-from-top-2 duration-300">
                        <td className="py-6 px-6">
                           <div className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">{new Date().toLocaleDateString()}</div>
                        </td>
                        <td className="py-6 px-6">
                           <Input 
                              placeholder="e.g. Electrician" 
                              className="bg-white text-xs font-bold"
                              value={newRow.trade}
                              onChange={e => setNewRow({...newRow, trade: e.target.value})}
                           />
                        </td>
                        <td className="py-6 px-6">
                           <textarea 
                              placeholder="e.g. Confirmed tag #5 attached to breaker" 
                              className="w-full bg-white border border-slate-200 rounded-md p-2 text-xs font-medium resize-none min-h-[60px] outline-none focus:ring-1 focus:ring-blue-500"
                              value={newRow.description}
                              onChange={e => setNewRow({...newRow, description: e.target.value})}
                           />
                        </td>
                        <td className="py-6 px-6 space-y-2">
                           <Input 
                              placeholder="Full Name" 
                              className="bg-white text-xs font-bold"
                              value={newRow.printName}
                              onChange={e => setNewRow({...newRow, printName: e.target.value})}
                           />
                           <Input 
                              placeholder="Phone Number" 
                              className="bg-white text-xs font-bold"
                              value={newRow.phone}
                              onChange={e => setNewRow({...newRow, phone: e.target.value})}
                           />
                        </td>
                        <td className="py-6 px-6">
                           <div className="flex flex-col gap-3 items-center">
                                {/* Sign Button (using camera) */}
                                <button 
                                    title="Take selfie to sign"
                                    onClick={startCamera}
                                    className={`flex h-16 w-16 items-center justify-center rounded-full transition-all border-2 ${signature ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20 shadow-lg' : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-400'}`}
                                >
                                    {signature ? <CheckCircle2 className="h-8 w-8" /> : <Camera className="h-8 w-8" />}
                                </button>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${signature ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    {signature ? 'Signed' : 'Tap to Sign'}
                                </span>
                           </div>
                        </td>
                        <td className="py-6 px-6">
                           <div className="flex flex-col gap-2">
                              <Button 
                                onClick={handleLockOn} 
                                disabled={isSubmitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 font-black text-xs h-10 shadow-lg shadow-emerald-500/20"
                              >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "SUBMIT LOCK ON"}
                              </Button>
                              <Button 
                                variant="ghost" 
                                onClick={() => setShowAddForm(false)}
                                className="w-full text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                                title="Cancel adding person"
                              >
                                <X className="h-4 w-4 mr-1" /> Cancel
                              </Button>
                           </div>
                        </td>
                     </tr>
                  )}

                  {locks.filter(l => l.companyName === selectedCompany).length === 0 && !showAddForm && (
                    <>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <tr key={`empty-${i}`} className="border-b border-slate-200">
                          <td className="py-8 px-6 border-r border-slate-200"></td>
                          <td className="py-8 px-6 border-r border-slate-200"></td>
                          <td className="py-8 px-6 border-r border-slate-200"></td>
                          <td className="py-8 px-6 border-r border-slate-200"></td>
                          <td className="py-8 px-6 border-r border-slate-200"></td>
                          <td className="py-8 px-6"></td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={6} className="py-12 text-center bg-slate-50 relative">
                           <div className="flex flex-col items-center">
                              <h3 className="text-slate-900 font-bold mb-1">No personnel registered for {selectedCompany}</h3>
                              <p className="text-slate-500 text-xs mb-4">Start by adding yourself or your crew members.</p>
                              <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md shadow-blue-500/20">
                                 <Plus className="h-4 w-4 mr-2" /> Add Crew Member
                              </Button>
                           </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Informative Footer */}
        <div className="mt-8 flex flex-col md:flex-row gap-6 items-center justify-between text-slate-400 bg-white/40 rounded-2xl p-6 border border-slate-200/50">
            <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-400 shrink-0" />
                <p className="text-xs font-medium leading-relaxed">
                    By signing LOCK ON, you confirm that you have personally inspected the tags and locks listed in the main LOTO form and are satisfied that the equipment is safely isolated.
                </p>
            </div>
            <div className="flex items-center gap-6 whitespace-nowrap">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">System Logs</span>
                    <span className="text-xs font-bold text-slate-600">Active Audit</span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
            </div>
        </div>
      </div>

      {/* --- CAMERA OVERLAY --- */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="font-black text-slate-900 tracking-tight">Verification Signature</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                    const stream = videoRef.current?.srcObject as MediaStream;
                    stream?.getTracks().forEach(track => track.stop());
                    setShowCamera(false);
                }} className="rounded-full" title="Close camera">
                    <X className="h-5 w-5" />
                </Button>
            </div>
            <div className="relative aspect-[3/4] bg-slate-100">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="h-full w-full object-cover mirror"
              />
              <div className="absolute inset-0 border-[3px] border-white/20 rounded-2xl m-4 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-8 flex justify-center">
                  <button 
                    title="Capture photo"
                    onClick={capturePhoto}
                    className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-slate-100 active:scale-95 transition-transform"
                  >
                    <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Camera className="h-5 w-5 text-white" />
                    </div>
                  </button>
              </div>
            </div>
            <div className="p-6 bg-slate-50/50">
                <p className="text-xs text-center font-bold text-slate-500 leading-relaxed uppercase tracking-tighter">Please ensure your face is clearly visible. This photo serves as your digital signature.</p>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}


      <style jsx global>{`
        .mirror {
            transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}

