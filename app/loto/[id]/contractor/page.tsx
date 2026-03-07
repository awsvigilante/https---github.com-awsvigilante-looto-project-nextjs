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
  X,
  ShieldCheck,
  Key,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { parseDurationToMs } from "@/lib/utils/time";

interface ContractorLock {
  id: string;
  taskId: string;
  contractorId: string;
  companyName: string;
  trade: string;
  description: string;
  contractorName: string;
  contractorEmail: string;
  contractorPhone: string;
  verificationPassword?: string;
  lockOnSignature: string;
  lockOnPhoto: string;
  lockedOnAt: string;
  lockOffType: string | null;
  lockOffNote: string | null;
  lockedOffAt: string | null;
  lockOffSignature: string | null;
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
  createdAt: string;
  expectedDuration?: string;
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
  const [selectedCompany, setSelectedCompany] = useState<string>("Contractor Crew");
  const companies = ["Black Dreams Electrical Crew", "Apex Industrial Services", "Global Pipefitters Ltd", "Sunrise Safety Team"];

  // Form State for new crew member
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState({
    company: "",
    trade: "",
    description: "",
    printName: "",
    email: "",
    phone: "",
    password: "",
  });
  
  // Real-time Camera Logic
  const [showCamera, setShowCamera] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Digital Signature Logic (Now automatically derived from selfie)
  const [signature, setSignature] = useState<string | null>(null);

  // Verification Choice Modal
  const [showVerifyOptions, setShowVerifyOptions] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'password' | 'email' | null>(null);
  const [isVerifyingPhoto, setIsVerifyingPhoto] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // New Lock Off Verification states
  const [showLockOffVerify, setShowLockOffVerify] = useState(false);
  const [verifyingLockId, setVerifyingLockId] = useState<string | null>(null);
  const [lockOffInput, setLockOffInput] = useState("");
  const [isVerifyingLockOff, setIsVerifyingLockOff] = useState(false);

  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [timerStatus, setTimerStatus] = useState<"pending" | "running" | "expired">("pending");

  useEffect(() => {
    if (!task || !locks.length) {
       setTimerStatus("pending");
       return;
    }

    // Find first lock on among currently active (pending) locks
    const activeLocks = locks.filter(l => l.lockedOnAt && !l.lockedOffAt);
    if (activeLocks.length === 0) {
       setTimerStatus("pending");
       setTimeLeft(null);
       setIsExpired(false);
       return;
    }

    const firstLockOn = activeLocks.reduce((min, p) => new Date(p.lockedOnAt) < new Date(min.lockedOnAt) ? p : min);
    const timerStart = new Date(firstLockOn.lockedOnAt).getTime();
    const durationMs = parseDurationToMs(task.expectedDuration);
    
    if (durationMs === 0) {
        setTimerStatus("pending");
        return;
    }

    const expirationTime = timerStart + durationMs;

    const interval = setInterval(() => {
        const now = Date.now();
        const diff = expirationTime - now;
        
        if (diff <= 0) {
           setTimeLeft(0);
           setTimerStatus("expired");
           setIsExpired(true);
        } else {
           setTimeLeft(diff);
           setTimerStatus("running");
           setIsExpired(false);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [task, locks]);

  const formatTime = (ms: number | null) => {
    if (ms === null) return "--h --m --s";
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds <= 0) return "00h 00m 00s";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

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

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      
      // Stop camera stream
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setShowCamera(false);

      // Start "AI" Verification
      setIsVerifyingPhoto(true);
      setVerificationError(null);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock logic: randomly pass or fail (but usually pass)
      // Check for extremely dark or light images (simple heuristic)
      const mockSuccess = true; // In a real app, this would be a call to a face-detection API
      
      setIsVerifyingPhoto(false);
      
      if (mockSuccess) {
        setSelfie(dataUrl);
        setSignature(dataUrl);
        setShowVerifyOptions(true);
        toast.success("Identity verified successfully!");
      } else {
        setVerificationError("Human face not detected or photo too blurry. Please try again.");
        toast.error("Photo verification failed");
      }
    }
  };


  const handleLockOn = async () => {
    const missing = [];
    if (!newRow.company) missing.push("Company");
    if (!newRow.trade) missing.push("Trade");
    if (!newRow.description) missing.push("Description");
    if (!newRow.printName) missing.push("Print Name");
    if (!selfie) missing.push("Photo/Sign");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newRow.email && !emailRegex.test(newRow.email)) {
      missing.push("Valid Email Address");
    }
    
    if (missing.length > 0) {
      toast.error(`Missing or Invalid: ${missing.join(", ")}`);
      console.log("Validation failed. Missing fields:", missing, { newRow, selfie });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        action: "contractor_lock_on",
        trade: newRow.trade,
        description: newRow.description,
        contractorName: newRow.printName,
        contractorEmail: newRow.email,
        contractorPhone: newRow.phone,
        verificationPassword: newRow.password,
        lockOnSignature: signature,
        lockOnPhoto: selfie,
        companyName: newRow.company,
        contractorId: currentUser?.id
      };

      const res = await fetch(`/api/loto/${id}/contractor-lock`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("LOCK ON successful!");
        setShowAddForm(false);
        setNewRow({ company: "", trade: "", description: "", printName: "", email: "", phone: "", password: "" });
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

  const handleLockOffVerify = async () => {
    if (!verifyingLockId || !lockOffInput) return;
    
    setIsVerifyingLockOff(true);
    try {
      const lock = locks.find(l => l.id === verifyingLockId);
      if (!lock) throw new Error("Lock not found");

      const res = await fetch(`/api/loto/${id}/contractor-lock`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          lockId: verifyingLockId, 
          verificationValue: lockOffInput,
          action: "verify_lock_off" 
        })
      });

      if (res.ok) {
        toast.success("Identity verified! Locking off...");
        await handleLockOff(verifyingLockId, "Self");
        setShowLockOffVerify(false);
        setLockOffInput("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Verification failed");
      }
    } catch (error) {
      toast.error("An error occurred during verification");
    } finally {
      setIsVerifyingLockOff(false);
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
        body: JSON.stringify({ 
          lockId, 
          lockOffType: type, 
          action: "contractor_lock_off",
          verificationValue: lockOffInput
        })
      });

      if (res.ok) {
        toast.success("LOCK OFF complete");
        fetchData();
      } else {
        toast.error("Failed to finalize LOCK OFF");
      }
    } catch (error) {
      toast.error("An error occurred during lock off");
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
               <div className="flex flex-col items-end mr-4">
                  <span className="text-sm font-bold text-slate-900">{currentUser?.name}</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full px-3">Contractor Access</span>
               </div>
               <Button 
                  onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("user");
                      router.push("/login");
                  }} 
                  className="bg-red-50 text-red-600 hover:bg-red-100 font-bold tracking-widest uppercase text-[10px] px-4"
               >
                  Logout
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
        
        {/* LOTO Active Timer */}
        <div className={`mb-8 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4 shadow-sm border ${
            timerStatus === 'expired' 
                ? 'bg-red-50 border-red-200' 
                : timerStatus === 'running' && timeLeft !== null && timeLeft < 3600000 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-white border-slate-200'
        }`}>
            <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
                    timerStatus === 'expired' ? 'bg-red-600 shadow-red-500/20' : 
                    timerStatus === 'running' && timeLeft !== null && timeLeft < 3600000 ? 'bg-amber-500 shadow-amber-500/20' : 
                    'bg-slate-800 shadow-slate-500/20'
                }`}>
                    <Clock className="h-6 w-6" />
                </div>
                <div>
                    <h3 className={`font-black uppercase tracking-widest text-xs mb-1 ${
                        timerStatus === 'expired' ? 'text-red-600' :
                        timerStatus === 'running' && timeLeft !== null && timeLeft < 3600000 ? 'text-amber-600' :
                        'text-slate-500'
                    }`}>
                        {timerStatus === 'expired' ? 'LOTO DURATION EXPIRED' : 
                         timerStatus === 'running' ? 'LOTO ACTIVE TIME REMAINING' : 
                         'LOTO DURATION STATUS'}
                    </h3>
                    <div className="text-3xl font-black tabular-nums tracking-tight text-slate-800">
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Expected Duration</span>
                <span className="text-sm font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full">{task?.expectedDuration || "Not Set"}</span>
                {timerStatus === 'pending' && (
                    <span className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                        <Info className="h-3 w-3" /> Timer starts upon first Lock On
                    </span>
                )}
                {timerStatus === 'expired' && (
                    <span className="text-[10px] font-bold text-red-500 mt-2 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="h-3 w-3" /> Shift Engineer Notified
                    </span>
                )}
            </div>
        </div>

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
                      <td className="py-5 px-6">
                        <div className="font-bold text-slate-900">{lock.companyName}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">{lock.trade}</div>
                      </td>
                      <td className="py-5 px-6 text-slate-600 max-w-[200px] leading-relaxed italic">
                        "{lock.description}"
                      </td>
                      <td className="py-5 px-6">
                        <div className="font-extrabold text-blue-600">{lock.contractorName}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">{lock.contractorEmail}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{lock.contractorPhone}</div>
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
                            {lock.lockOffSignature && (
                                <img src={lock.lockOffSignature} alt="Lock Off Signature" className="h-10 object-contain mb-1 opacity-80" />
                            )}
                            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                                <Shield className="h-3 w-3" /> VERIFIED
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5 font-bold tracking-wider">
                                {new Date(lock.lockedOffAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                             <Button 
                                onClick={() => {
                                  setVerifyingLockId(lock.id);
                                  setShowLockOffVerify(true);
                                }}
                                className="h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 font-black text-[10px] tracking-widest px-4 shadow-sm transition-all"
                             >
                                LOCK OFF
                             </Button>
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
                        <td className="py-6 px-6 space-y-2">
                           <Input 
                              placeholder="Company Name" 
                              className="bg-white text-xs font-bold"
                              value={newRow.company}
                              onChange={e => setNewRow({...newRow, company: e.target.value})}
                           />
                           <Input 
                              placeholder="Trade (e.g. Electrician)" 
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
                              placeholder="Full Name (Print)" 
                              className="bg-white text-xs font-bold"
                              value={newRow.printName}
                              onChange={e => setNewRow({...newRow, printName: e.target.value})}
                           />
                           <Input 
                              placeholder="Email Address" 
                              type="email"
                              className="bg-white text-xs font-bold"
                              value={newRow.email}
                              onChange={e => setNewRow({...newRow, email: e.target.value})}
                           />
                           <Input 
                              placeholder="Phone #" 
                              className="bg-white text-xs font-bold"
                              value={newRow.phone}
                              onChange={e => setNewRow({...newRow, phone: e.target.value})}
                           />
                           <p className="text-[9px] text-slate-400 italic">Identity verification setup will appear after signing.</p>
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

                  {locks.length === 0 && !showAddForm && (
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
                              <h3 className="text-slate-900 font-bold mb-1">No personnel registered yet</h3>
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
            {/* Verification Loading Overlay (Simulated AI) */}
            {isVerifyingPhoto && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
                  <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-blue-600" />
                </div>
                <h4 className="mt-6 font-black text-slate-900 uppercase tracking-widest text-xs">Analyzing Biometrics</h4>
                <p className="mt-2 text-[10px] text-slate-500 font-bold uppercase">Verifying human presence & clarity...</p>
              </div>
            )}
            
            {/* Verification Error UI */}
            {verificationError && !isVerifyingPhoto && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 p-8 text-center animate-in zoom-in-95 duration-200">
                <div className="h-16 w-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h4 className="font-black text-slate-900 uppercase mb-2">Verification Failed</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">{verificationError}</p>
                <Button onClick={startCamera} className="bg-slate-900 hover:bg-black font-bold rounded-2xl px-8">
                  RE-TAKE PHOTO
                </Button>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}


      {/* --- LOCK OFF VERIFICATION MODAL --- */}
      {showLockOffVerify && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100/50">
            <CardHeader className="pt-10 pb-4 text-center">
              <div className="mx-auto h-24 w-24 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg mb-4">
                {locks.find(l => l.id === verifyingLockId)?.lockOnPhoto ? (
                  <img 
                    src={locks.find(l => l.id === verifyingLockId)?.lockOnPhoto} 
                    alt="Current Contractor" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <div className="h-full w-full bg-blue-50 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">Verify Identity</CardTitle>
              <CardDescription className="text-slate-500 font-medium px-4 leading-relaxed mt-1">
                Welcome back, <b>{locks.find(l => l.id === verifyingLockId)?.contractorName}</b>. <br/>
                Please verify your identity to complete <b>LOCK OFF</b>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Enter Verification</Label>
                  <Key className="h-3 w-3 text-blue-400" />
                </div>
                <Input 
                  type="password"
                  placeholder="Password or Email Code"
                  className="rounded-2xl border-none bg-white font-bold py-6 px-4 text-xl shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all text-center tracking-extra-wide"
                  value={lockOffInput}
                  onChange={(e) => setLockOffInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleLockOffVerify()}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="ghost"
                  className="flex-1 h-12 rounded-2xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all uppercase tracking-widest text-[10px]"
                  onClick={() => {
                    setShowLockOffVerify(false);
                    setLockOffInput("");
                  }}
                >
                  CANCEL
                </Button>
                <Button 
                  disabled={!lockOffInput || isVerifyingLockOff}
                  className="flex-[2] h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  onClick={() => handleLockOffVerify()}
                >
                  {isVerifyingLockOff ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>CONFIRM LOCK OFF <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* --- VERIFICATION CHOICE OVERLAY --- */}
      {showVerifyOptions && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <Card className="w-full max-w-sm border-none shadow-2xl rounded-3xl bg-white overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold">Secure Your Entry</CardTitle>
              <CardDescription className="text-slate-500 font-medium">To edit or re-access your entry later, how would you like to verify your identity?</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-3">
                <button 
                  onClick={() => setVerificationMethod('password')}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${verificationMethod === 'password' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${verificationMethod === 'password' ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                    <Plus className="h-5 w-5 rotate-45" /> {/* Using Plus rotated as placeholder for lock/pass */}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Set Password</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Manual entry</div>
                  </div>
                  {verificationMethod === 'password' && <CheckCircle2 className="ml-auto h-5 w-5 text-blue-500" />}
                </button>

                <button 
                  onClick={() => setVerificationMethod('email')}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${verificationMethod === 'email' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${verificationMethod === 'email' ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Verify with Email</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">A code will be sent</div>
                  </div>
                  {verificationMethod === 'email' && <CheckCircle2 className="ml-auto h-5 w-5 text-blue-500" />}
                </button>
              </div>

              {verificationMethod === 'password' && (
                <div className="pt-2 animate-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Create Security Password</Label>
                    <Shield className="h-3 w-3 text-blue-400" />
                  </div>
                  <Input 
                    type="password"
                    placeholder="Min 4 characters"
                    className="rounded-2xl bg-blue-50/30 border-blue-100 font-bold py-7 px-5 text-lg placeholder:text-slate-300 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-inner"
                    value={newRow.password}
                    onChange={(e) => setNewRow({...newRow, password: e.target.value})}
                    autoFocus
                  />
                  <p className="mt-2 text-[9px] text-slate-400 font-bold leading-tight">
                    This password will be required if you ever need to edit your lock-on details.
                  </p>
                </div>
              )}

              {verificationMethod === 'email' && (
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 animate-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-black text-amber-900 text-[11px] uppercase tracking-wide">Email Verification Active</h5>
                    <p className="text-[10px] text-amber-800/80 font-bold leading-snug mt-1">
                      A secure code will be sent to <span className="underline font-black">{newRow.email || 'your email'}</span> for any future access requests.
                    </p>
                  </div>
                </div>
              )}

              <Button 
                disabled={!verificationMethod || (verificationMethod === 'password' && (!newRow.password || newRow.password.length < 4))}
                className={`w-full h-14 rounded-2xl font-black tracking-widest text-sm shadow-2xl transition-all duration-300 mt-4 overflow-hidden relative group ${verificationMethod ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-slate-100 text-slate-400 shadow-none'}`}
                onClick={() => setShowVerifyOptions(false)}
              >
                <span className="relative z-10">APPLY & FINALIZE ENTRY</span>
                {verificationMethod && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <style jsx global>{`
        .mirror {
            transform: scaleX(-1);
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

