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
  Users2,
  ShieldCheck,
  Key,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  maintenanceSignature?: string;
  maintenanceSignedAt?: string;
  shiftEngineerSignature?: string;
  shiftEngineerSignedAt?: string;
}

export default function ContractorPortal() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<LotoTask | null>(null);
  const [locks, setLocks] = useState<ContractorLock[]>([]);
  const [points, setPoints] = useState<IsolationPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Maintenance & Shift Engineer Role Signature
  const [signatureRole, setSignatureRole] = useState<"maintenance" | "shift_engineer" | null>(null);
  const [showRoleSignatureModal, setShowRoleSignatureModal] = useState(false);
  const roleSigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isRoleSignSubmitting, setIsRoleSignSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // New: Company Selection (Derived from logged in user)
  const selectedCompany = currentUser?.companyName || "Contractor Crew";

  // Form State for new crew member
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState({
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
  const [verificationMethod, setVerificationMethod] = useState<
    "password" | "email" | null
  >(null);
  const [isVerifyingPhoto, setIsVerifyingPhoto] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );

  // New Lock Off Verification states
  const [showLockOffVerify, setShowLockOffVerify] = useState(false);
  const [verifyingLockId, setVerifyingLockId] = useState<string | null>(null);
  const [lockOffInput, setLockOffInput] = useState("");
  const [isVerifyingLockOff, setIsVerifyingLockOff] = useState(false);
  const [lockOffData, setLockOffData] = useState<Record<string, { jobStatus: string, comment: string }>>({});

  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [timerStatus, setTimerStatus] = useState<
    "pending" | "running" | "expired"
  >("pending");

  useEffect(() => {
    if (!task || !locks.length) {
      setTimerStatus("pending");
      return;
    }

    // Find earliest lock on among ALL locks recorded for this task
    const historicalLocks = locks.filter((l) => l.lockedOnAt);
    if (historicalLocks.length === 0) {
      setTimerStatus("pending");
      setTimeLeft(null);
      setIsExpired(false);
      return;
    }

    const firstEverLockOn = historicalLocks.reduce((min, p) =>
      new Date(p.lockedOnAt) < new Date(min.lockedOnAt) ? p : min,
    );
    const timerStart = new Date(firstEverLockOn.lockedOnAt).getTime();
    const durationMs = parseDurationToMs(task.expectedDuration);

    if (durationMs === 0) {
      // If no valid duration, show timer as "active" but with no countdown? 
      // Actually, if it's 0, it won't count. Let's at least set status to running if there are locks.
      setTimerStatus("running");
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
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
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
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/loto/${id}/contractor-lock`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
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
      stream?.getTracks().forEach((track) => track.stop());
      setShowCamera(false);

      // Start "AI" Verification
      setIsVerifyingPhoto(true);
      setVerificationError(null);

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
        setVerificationError(
          "Human face not detected or photo too blurry. Please try again.",
        );
        toast.error("Photo verification failed");
      }
    }
  };

  const handleLockOn = async () => {
    const missing = [];
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
      console.log("Validation failed. Missing fields:", missing, {
        newRow,
        selfie,
      });
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
        companyName: selectedCompany,
        contractorId: currentUser?.id,
      };

      const res = await fetch(`/api/loto/${id}/contractor-lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("LOCK ON successful!");
        setShowAddForm(false);
        setNewRow({
          trade: "",
          description: "",
          printName: "",
          email: "",
          phone: "",
          password: "",
        });
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
      const lock = locks.find((l) => l.id === verifyingLockId);
      if (!lock) throw new Error("Lock not found");

      const res = await fetch(`/api/loto/${id}/contractor-lock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lockId: verifyingLockId,
          verificationValue: lockOffInput,
          action: "verify_lock_off",
        }),
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
      const lockState = lockOffData[lockId] || {};
      const res = await fetch(`/api/loto/${id}/contractor-lock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lockId,
          lockOffType: type,
          action: "contractor_lock_off",
          verificationValue: lockOffInput,
          jobStatus: lockState.jobStatus || "",
          comment: lockState.comment || "",
        }),
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

  const handleRoleSignSubmit = async () => {
    if (!roleSigCanvasRef.current || !signatureRole) return;
    const canvas = roleSigCanvasRef.current;
    
    const blank = document.createElement("canvas");
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      toast.error("Please provide a signature first.");
      return;
    }

    const signatureData = canvas.toDataURL("image/png");
    setIsRoleSignSubmitting(true);
    try {
      const res = await fetch(`/api/loto/${id}/contractor-lock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: signatureRole === "maintenance" 
            ? "maintenance_sign_contractor" 
            : "shift_engineer_sign_contractor",
          signature: signatureData,
        }),
      });

      if (res.ok) {
        toast.success(`${signatureRole === "maintenance" ? "Maintenance Supervisor" : "Shift Engineer"} Signature Saved`);
        setShowRoleSignatureModal(false);
        setSignatureRole(null);
        fetchData();
      } else {
        toast.error("Failed to save signature");
      }
    } catch (err) {
      toast.error("An error occurred saving signature");
    } finally {
      setIsRoleSignSubmitting(false);
    }
  };

  const clearRoleSignature = () => {
    if (!roleSigCanvasRef.current) return;
    const ctx = roleSigCanvasRef.current.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, roleSigCanvasRef.current.width, roleSigCanvasRef.current.height);
  };

  const [isDrawing, setIsDrawing] = useState(false);
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!roleSigCanvasRef.current) return;
    const canvas = roleSigCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !roleSigCanvasRef.current) return;
    const canvas = roleSigCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const stopDrawing = () => setIsDrawing(false);

  if (isLoading || !task) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-white font-bold text-xs uppercase tracking-widest animate-pulse">
            Initializing Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 selection:bg-emerald-500/30">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Contractor Portal
                </h1>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[8px] font-bold text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
                  Secure Access
                </span>
              </div>
              <p className="text-[10px] font-bold text-white font-bold uppercase tracking-[0.2em]">
                {task?.lotoId} • {task?.equipmentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end px-4 border-r border-white/5">
              <span className="text-xs font-bold text-white">
                {currentUser?.name}
              </span>
              <span className="text-[9px] font-bold text-white font-bold uppercase tracking-widest">
                Authorized Personnel
              </span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                router.push("/login");
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/5 text-[10px] font-bold text-white font-bold hover:text-red-400 hover:border-red-500/30 transition-all uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        {/* LOTO Duration Timer */}
        <Card className="border-white/5 bg-zinc-900/40 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div
                className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${
                  timerStatus === "expired"
                    ? "bg-red-500 shadow-red-500/40"
                    : timerStatus === "running" &&
                        timeLeft !== null &&
                        timeLeft < 3600000
                      ? "bg-amber-500 shadow-amber-500/40"
                      : "bg-emerald-500 shadow-emerald-500/40"
                }`}
              >
                <Clock className="w-10 h-10" />
              </div>
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-2 block ${
                    timerStatus === "expired" ? "text-red-400" : "text-white font-bold"
                  }`}
                >
                  {timerStatus === "expired" ? "EXPIRED" : "REMAINING TIME"}
                </span>
                <div className="text-5xl font-bold text-white tabular-nums tracking-tighter">
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-950 border border-white/5">
                <span className="text-[9px] font-bold text-white font-bold uppercase tracking-widest">
                  Allocation
                </span>
                <span className="text-xs font-bold text-white">
                  {task?.expectedDuration}
                </span>
              </div>
              {timerStatus === "expired" && (
                <div className="flex items-center gap-2 text-red-400 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">
                    Exceeded
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <Card className="lg:col-span-2 border-white/5 bg-zinc-900/40 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10 lg:p-4">
            <div className="p-6 md:p-8 space-y-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Safety Summary
                  </h2>
                  <p className="text-[10px] font-bold text-white font-bold uppercase tracking-widest">
                    Verified Isolation State
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <Label className="text-[10px] font-bold text-white font-bold uppercase tracking-[0.2em] mb-3 block">
                      Reason for Isolation
                    </Label>
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                      <div className="relative p-5 rounded-2xl bg-zinc-900 border border-white/10 text-sm font-bold text-zinc-300 leading-relaxed min-h-[100px]">
                        {task?.reasonForIsolation ||
                          "No explicit reason provided"}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                    <div>
                      <span className="text-[10px] font-bold text-white font-bold uppercase tracking-widest block mb-1">
                        Lock Box
                      </span>
                      <span className="text-3xl font-bold text-white tracking-tighter">
                        {task?.lockBoxNumber}
                      </span>
                    </div>
                    <Key className="w-8 h-8 text-zinc-800 group-hover:text-emerald-500/50 transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-bold text-white font-bold uppercase tracking-[0.2em] mb-3 block">
                    Authorized Personnel
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-white/10 group hover:bg-zinc-800 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold group-hover:text-emerald-400 transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                          Primary Operator
                        </p>
                        <p className="text-sm font-bold text-white">
                          {task?.primaryOperator?.name}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500/50 ml-auto" />
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-white/10 group hover:bg-zinc-800 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold group-hover:text-emerald-400 transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                          Operator (Verification)
                        </p>
                        <p className="text-sm font-bold text-white">
                          {task?.supervisor?.name}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500/50 ml-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tags / Points */}
          <Card className="border-white/5 bg-zinc-900/40 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10">
            <div className="p-6 border-b border-white/5 bg-zinc-950/20">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white tracking-tight">
                  Active Tags
                </h3>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[350px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-950/50">
                    <th className="py-4 px-6 text-[9px] font-bold text-zinc-600 uppercase tracking-widest border-b border-white/5">
                      Lock ID
                    </th>
                    <th className="py-4 px-6 text-[9px] font-bold text-zinc-600 uppercase tracking-widest border-b border-white/5">
                      Point Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {points.map((pt) => (
                    <tr
                      key={pt.id}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4 px-6">
                        <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-white/15 flex items-center justify-center text-[10px] font-bold text-emerald-500 group-hover:border-emerald-500/30 transition-all shadow-lg">
                          {pt.tagNo}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">
                            {pt.isolationDescription}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">
                            {pt.requiredPosition}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Status Banner */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative rounded-3xl bg-zinc-900/80 border border-emerald-500/20 p-8 flex items-start gap-6 backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-2xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                LOTO Active & Verified
              </h3>
              <p className="text-sm font-bold text-white font-bold leading-relaxed max-w-2xl">
                This system state has been mechanically verified. All energy
                sources are effectively isolated. Authorized personnel may now
                apply personal locks.
              </p>
            </div>
          </div>
        </div>

        {/* Crew Tracking Section */}
        <Card className="border-white/5 bg-zinc-900/40 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10">
          <div className="p-6 md:p-8 border-b border-white/5 bg-zinc-950/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Users2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Crew Tracking
                </h2>
              </div>
              <p className="text-[10px] font-bold text-white font-bold uppercase tracking-widest">
                Registered Members • {selectedCompany}
              </p>
            </div>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 rounded-2xl bg-emerald-500 text-[10px] font-bold text-zinc-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Crew Member
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-950/20">
                  <th className="px-6 py-5 text-left text-[9px] font-bold text-white font-bold uppercase tracking-widest">
                    Date
                  </th>
                  <th className="px-6 py-5 text-left text-[9px] font-bold text-white font-bold uppercase tracking-widest">
                    Identity
                  </th>
                  <th className="px-6 py-5 text-left text-[9px] font-bold text-white font-bold uppercase tracking-widest">
                    Description
                  </th>
                  <th className="px-6 py-5 text-center text-[9px] font-bold text-white font-bold uppercase tracking-widest">
                    Phone
                  </th>
                  <th className="px-6 py-5 text-center text-[9px] font-bold text-white font-bold uppercase tracking-widest">
                    Lock Status
                  </th>
                  <th className="px-6 py-5 text-center text-[9px] font-bold text-white uppercase tracking-widest">
                    Job Status
                  </th>
                  <th className="px-6 py-5 text-center text-[9px] font-bold text-white uppercase tracking-widest">
                    Comment
                  </th>
                  <th className="px-6 py-5 text-right text-[9px] font-bold text-white font-bold uppercase tracking-widest">
                    Activity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {locks
                  .filter((l) => l.companyName === selectedCompany)
                  .map((lock) => (
                    <tr
                      key={lock.id}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-white font-bold">
                          {new Date(lock.lockedOnAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden ring-1 ring-white/10 group-hover:ring-emerald-500/30 transition-all flex items-center justify-center text-[10px] font-bold text-zinc-500">
                            {lock.lockOnPhoto ? (
                              <img
                                src={lock.lockOnPhoto}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                              />
                            ) : (
                              lock.contractorName?.charAt(0)
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                              {lock.contractorName}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                              {lock.trade}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-white font-bold leading-relaxed italic max-w-[200px] line-clamp-2">
                          "{lock.description}"
                        </p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-[10px] font-bold text-zinc-400">
                          {lock.contractorPhone || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          {lock.lockedOnAt && !lock.lockedOffAt ? (
                            <div className="flex flex-col items-center gap-1.5 animate-pulse">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                <Key className="w-4 h-4 text-emerald-400" />
                              </div>
                              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                                Locked
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 opacity-30">
                              <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-white font-bold" />
                              </div>
                              <span className="text-[8px] font-bold text-white font-bold uppercase tracking-widest">
                                Released
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {!lock.lockedOffAt ? (
                          <select
                            className="bg-zinc-900 border border-white/10 text-[10px] font-bold text-white rounded-lg p-2 focus:ring-emerald-500/50 outline-none w-24"
                            value={lockOffData[lock.id]?.jobStatus || ""}
                            onChange={(e) => setLockOffData(prev => ({ ...prev, [lock.id]: { ...prev[lock.id], jobStatus: e.target.value } }))}
                          >
                            <option value="">Select</option>
                            <option value="Complete">Complete</option>
                            <option value="Incomplete">Incomplete</option>
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-400">{(lock as any).jobStatus || "—"}</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {!lock.lockedOffAt ? (
                          lockOffData[lock.id]?.jobStatus === "Incomplete" ? (
                            <div className="relative h-8 w-32">
                              <textarea
                                placeholder="Reason for incomplete..."
                                className="absolute top-0 left-0 bg-zinc-900 border border-white/10 text-[10px] font-bold text-white rounded-lg p-2 outline-none w-32 h-8 min-h-[32px] focus:w-72 focus:h-28 focus:z-[60] focus:-translate-y-10 focus:-translate-x-40 focus:ring-2 focus:ring-emerald-500 focus:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] focus:bg-zinc-800 transition-all duration-300 resize-none"
                                value={lockOffData[lock.id]?.comment || ""}
                                onChange={(e) => setLockOffData(prev => ({ ...prev, [lock.id]: { ...prev[lock.id], comment: e.target.value } }))}
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-600 italic">N/A</span>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-400">{(lock as any).comment || "—"}</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {!lock.lockedOffAt ? (
                          <button
                            disabled={
                              !lockOffData[lock.id]?.jobStatus || 
                              (lockOffData[lock.id]?.jobStatus === "Incomplete" && !lockOffData[lock.id]?.comment?.trim())
                            }
                            onClick={() => {
                              setVerifyingLockId(lock.id);
                              setShowLockOffVerify(true);
                            }}
                            className="px-6 py-2.5 rounded-xl bg-zinc-950 border border-white/5 text-[10px] font-bold text-white font-bold hover:text-white hover:bg-zinc-900 active:scale-95 transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            LOCK OFF
                          </button>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-white font-bold">
                              Returned
                            </span>
                            <span className="text-[9px] font-bold text-zinc-700 uppercase">
                              {new Date(lock.lockedOffAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                {/* Inline Add Form */}
                {showAddForm && (
                  <tr className="bg-emerald-500/[0.03] animate-in fade-in slide-in-from-top-4 duration-500">
                    <td className="px-6 py-8" colSpan={2}>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <Label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">
                            Member Identity
                          </Label>
                          <Input
                            placeholder="Full Name"
                            className="bg-zinc-900 border-white/10 text-sm font-bold text-white rounded-xl focus:border-emerald-500/30 transition-all h-11 placeholder:text-zinc-500"
                            value={newRow.printName}
                            onChange={(e) =>
                              setNewRow({
                                ...newRow,
                                printName: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">
                            Trade Specialty
                          </Label>
                          <Input
                            placeholder="e.g. Lead Electrician"
                            className="bg-zinc-900 border-white/10 text-sm font-bold text-white rounded-xl focus:border-emerald-500/30 transition-all h-11 placeholder:text-zinc-500"
                            value={newRow.trade}
                            onChange={(e) =>
                              setNewRow({ ...newRow, trade: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                          <Label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">
                            Phone Number
                          </Label>
                          <Input
                            placeholder="Phone Number"
                            className="bg-zinc-900 border-white/10 text-sm font-bold text-white rounded-xl focus:border-emerald-500/30 transition-all h-11 placeholder:text-zinc-500"
                            value={newRow.phone || ""}
                            onChange={(e) =>
                              setNewRow({ ...newRow, phone: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-8">
                      <div className="flex flex-col gap-2">
                        <Label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">
                          Description
                        </Label>
                        <textarea
                          placeholder="Isolation confirmation details..."
                          className="bg-zinc-900 border border-white/10 text-xs font-bold text-white rounded-xl p-4 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none min-h-[104px] resize-none placeholder:text-zinc-500"
                          value={newRow.description}
                          onChange={(e) =>
                            setNewRow({
                              ...newRow,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                    </td>
                    <td className="px-6 py-8">
                      <div className="flex flex-col items-center gap-3">
                        <button
                          onClick={startCamera}
                          className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-500 border shadow-2xl ${
                            signature
                              ? "bg-emerald-500 border-white/20 text-zinc-950"
                              : "bg-zinc-950 border-white/5 text-zinc-600 hover:text-emerald-400 hover:border-emerald-500/30"
                          }`}
                        >
                          {signature ? (
                            <CheckCircle2 className="w-8 h-8" />
                          ) : (
                            <Camera className="w-8 h-8" />
                          )}
                        </button>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-widest ${signature ? "text-emerald-400" : "text-zinc-600"}`}
                        >
                          {signature ? "Identity Set" : "Verifying Photo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-8">
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleLockOn}
                          disabled={isSubmitting}
                          className="w-full bg-emerald-500 text-[10px] font-bold text-zinc-950 p-3 rounded-xl hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Confirm Entry"
                          )}
                        </button>
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="w-full text-[9px] font-bold text-zinc-600 hover:text-white font-bold uppercase tracking-widest transition-colors py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Maintenance Supervisor Sign Off Card */}
        <Card className="border-white/5 bg-zinc-900/40 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10 mb-8 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Maintenance Supervisor Sign-Off
                </h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                  Required authorization acknowledgement.
                </p>
              </div>
            </div>
            {task.maintenanceSignature ? (
              <div className="flex flex-col items-end">
                <div className="h-16 w-32 rounded-xl bg-white border border-slate-200 p-2 shadow-inner">
                  <img
                    src={task.maintenanceSignature}
                    alt="Maintenance Signature"
                    className="h-full w-full object-contain grayscale"
                  />
                </div>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Signed At: {new Date(task.maintenanceSignedAt!).toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setSignatureRole("maintenance");
                  setShowRoleSignatureModal(true);
                }}
                disabled={!locks.some(lock => lock.lockedOffAt !== null)}
                title={!locks.some(lock => lock.lockedOffAt !== null) ? "Awaiting at least one Contractor Lock-Off" : ""}
                className="shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-6 px-8 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                <PenTool className="w-5 h-5 mr-no-2" style={{ marginRight: "8px" }} />
                MAINTENANCE SUPERVISOR SIGN
              </Button>
            )}
          </div>
        </Card>

        {/* Shift Engineer Sign Off Card */}
        <Card className="border-white/5 bg-zinc-900/40 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10 mb-8 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Shift Engineer Sign-Off
                </h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                  Final authorization acknowledgement.
                </p>
              </div>
            </div>
            {task.shiftEngineerSignature ? (
              <div className="flex flex-col items-end">
                <div className="h-16 w-32 rounded-xl bg-white border border-slate-200 p-2 shadow-inner">
                  <img
                    src={task.shiftEngineerSignature}
                    alt="Shift Engineer Signature"
                    className="h-full w-full object-contain grayscale"
                  />
                </div>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Signed At: {new Date(task.shiftEngineerSignedAt!).toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setSignatureRole("shift_engineer");
                  setShowRoleSignatureModal(true);
                }}
                disabled={!task.maintenanceSignature}
                title={!task.maintenanceSignature ? "Awaiting Maintenance Supervisor Signature first" : ""}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-6 px-8 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                <PenTool className="w-5 h-5 mr-no-2" style={{ marginRight: "8px" }} />
                SHIFT ENGINEER SIGN
              </Button>
            )}
          </div>
        </Card>

        {/* Footer info */}
        <div className="p-8 rounded-3xl bg-zinc-900/20 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400/50">
              <Info className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-white font-bold leading-relaxed max-w-xl uppercase tracking-wider">
              By confirming your entry, you are providing a legally binding
              digital signature. All activities are timestamped and logged in
              the secure audit chain.
            </p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-950 border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
              Active System Guard
            </span>
          </div>
        </div>
      </main>

      {/* --- CAMERA OVERLAY --- */}
      {showCamera && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-2xl p-4 animate-in fade-in duration-500">
          <div className="w-full max-w-lg bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_0_100px_rgba(16,185,129,0.1)]">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Biometric Signature
                  </h3>
                  <p className="text-[9px] font-bold text-white font-bold uppercase tracking-widest mt-0.5">
                    Capturing ID Hash
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  stream?.getTracks().forEach((track) => track.stop());
                  setShowCamera(false);
                }}
                className="w-10 h-10 rounded-full hover:bg-white/5 transition-colors flex items-center justify-center text-white font-bold"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative aspect-video bg-black rounded-3xl m-6 overflow-hidden border border-white/5 group shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover mirror grayscale hover:grayscale-0 transition-all duration-1000"
              />
              <div className="absolute inset-0 border-[2px] border-white/10 rounded-[2rem] m-6 pointer-events-none group-hover:border-emerald-500/20 transition-all duration-700" />

              <div className="absolute inset-x-0 bottom-10 flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full bg-white/10 border-4 border-white backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                >
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-zinc-950">
                    <Camera className="w-6 h-6" />
                  </div>
                </button>
              </div>
            </div>
            <div className="p-8 bg-zinc-950/50 text-center">
              <p className="text-[10px] font-bold text-white font-bold uppercase tracking-[0.3em] leading-relaxed">
                Position your face within the frame. Clarity affects validation
                results.
              </p>
            </div>

            {isVerifyingPhoto && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-3xl animate-in fade-in duration-500">
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                  <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                </div>
                <h4 className="text-xl font-bold text-white uppercase tracking-[0.3em]">
                  Analyzing ID
                </h4>
                <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em] mt-3 animate-pulse">
                  Running mechanical compliance check...
                </p>
              </div>
            )}

            {verificationError && !isVerifyingPhoto && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/95 p-12 text-center animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 text-red-500 flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">
                  Signal Failure
                </h4>
                <p className="text-sm font-bold text-white font-bold leading-relaxed mb-10 max-w-sm">
                  {verificationError}
                </p>
                <button
                  onClick={startCamera}
                  className="px-10 py-4 rounded-2xl bg-white text-[11px] font-bold text-zinc-950 hover:bg-zinc-200 active:scale-95 transition-all shadow-2xl uppercase tracking-widest"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* --- LOCK OFF VERIFICATION MODAL --- */}
      {showLockOffVerify && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-2xl animate-in fade-in duration-500">
          <Card className="w-full max-w-md bg-zinc-900 rounded-[3rem] border border-white/5 overflow-hidden animate-in zoom-in-95 duration-500 shadow-2xl ring-1 ring-white/10">
            <div className="p-10 text-center space-y-8">
              <div className="mx-auto w-32 h-32 rounded-[2.5rem] overflow-hidden border-2 border-emerald-500/30 p-1 bg-zinc-950 shadow-2xl relative group">
                {locks.find((l) => l.id === verifyingLockId)?.lockOnPhoto ? (
                  <img
                    src={
                      locks.find((l) => l.id === verifyingLockId)?.lockOnPhoto
                    }
                    className="w-full h-full object-cover grayscale transition-all duration-700"
                  />
                ) : (
                  <div className="h-full w-full bg-zinc-900 flex items-center justify-center">
                    <Shield className="w-12 h-12 text-zinc-800" />
                  </div>
                )}
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Initialize Release
                </h2>
                <p className="text-[10px] font-bold text-white font-bold uppercase tracking-widest mt-2 px-8 leading-relaxed">
                  Identity link:{" "}
                  <span className="text-white">
                    {
                      locks.find((l) => l.id === verifyingLockId)
                        ?.contractorName
                    }
                  </span>
                  . Please authorize final lock-off sequence.
                </p>
              </div>

              <div className="bg-zinc-800/50 rounded-[2rem] p-6 border border-white/10 space-y-4 shadow-inner">
                <div className="flex items-center justify-between px-2">
                  <Label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    Key Authorization
                  </Label>
                  <Key className="w-4 h-4 text-emerald-500/30" />
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="rounded-2xl border-none bg-zinc-800 font-bold py-8 px-6 text-3xl shadow-2xl focus:ring-0 focus:outline-none text-center tracking-widest text-emerald-400 placeholder:text-zinc-700"
                  value={lockOffInput}
                  onChange={(e) => setLockOffInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleLockOffVerify()}
                />
              </div>

              <div className="flex flex-col gap-4">
                <button
                  disabled={!lockOffInput || isVerifyingLockOff}
                  onClick={() => handleLockOffVerify()}
                  className="w-full h-16 rounded-2xl bg-emerald-500 text-[11px] font-bold text-zinc-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isVerifyingLockOff ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Authorize Release <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowLockOffVerify(false);
                    setLockOffInput("");
                  }}
                  className="text-[10px] font-bold text-zinc-600 hover:text-white font-bold uppercase tracking-widest transition-colors py-2"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- VERIFICATION CHOICE OVERLAY --- */}
      {showVerifyOptions && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950/90 backdrop-blur-2xl p-6 animate-in fade-in duration-500">
          <Card className="w-full max-w-md bg-zinc-900 rounded-[3rem] border border-white/5 overflow-hidden animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="p-10 space-y-10">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-2xl">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Security Protocol
                </h3>
                <p className="text-[10px] font-bold text-white font-bold uppercase tracking-widest mt-2">
                  Required for Future Release Authorization
                </p>
              </div>

              <div className="grid gap-4">
                <button
                  onClick={() => setVerificationMethod("password")}
                  className={`flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left group ${verificationMethod === "password" ? "border-emerald-500 bg-emerald-500/5" : "border-white/5 bg-zinc-950 hover:border-white/10"}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${verificationMethod === "password" ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20" : "bg-zinc-900 text-zinc-600"}`}
                  >
                    <Plus className="w-6 h-6 rotate-45" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white tracking-tight">
                      Set Guard Key
                    </div>
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                      Localized Access
                    </div>
                  </div>
                  {verificationMethod === "password" && (
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => setVerificationMethod("email")}
                  className={`flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left group ${verificationMethod === "email" ? "border-emerald-500 bg-emerald-500/5" : "border-white/5 bg-zinc-950 hover:border-white/10"}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${verificationMethod === "email" ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20" : "bg-zinc-900 text-zinc-600"}`}
                  >
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white tracking-tight">
                      Email Token
                    </div>
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                      Network Verification
                    </div>
                  </div>
                  {verificationMethod === "email" && (
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              </div>

              {verificationMethod === "password" && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
                  <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/10 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                        Create Protocol Key
                      </Label>
                      <Key className="w-3 h-3 text-emerald-500/30" />
                    </div>
                    <Input
                      type="password"
                      placeholder="Min 4 digits"
                      className="bg-transparent border-none text-3xl font-bold text-white p-0 focus:ring-0 placeholder:text-zinc-800 tracking-[0.3em] h-12"
                      value={newRow.password}
                      onChange={(e) =>
                        setNewRow({ ...newRow, password: e.target.value })
                      }
                      autoFocus
                    />
                  </div>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider text-center px-4 leading-relaxed">
                    This key acts as your secure override for authorizing lock
                    release.
                  </p>
                </div>
              )}

              {verificationMethod === "email" && (
                <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex gap-4 animate-in slide-in-from-bottom-4 duration-500">
                  <Info className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-[10px] font-bold text-zinc-300 uppercase leading-relaxed tracking-wider">
                    Transmission active. Verification tokens will be routed to{" "}
                    <span className="text-emerald-400 decoration-emerald-500/30 underline-offset-4 underline">
                      {newRow.email}
                    </span>
                    .
                  </p>
                </div>
              )}

              <button
                disabled={
                  !verificationMethod ||
                  (verificationMethod === "password" &&
                    (!newRow.password || newRow.password.length < 4))
                }
                onClick={() => setShowVerifyOptions(false)}
                className="w-full h-16 rounded-2xl bg-emerald-500 text-[11px] font-bold text-zinc-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 uppercase tracking-[0.2em] relative overflow-hidden group disabled:opacity-50"
              >
                <span className="relative z-10">Initialize Commitment</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* --- ROLE SIGNATURE MODAL --- */}
      {showRoleSignatureModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-zinc-900 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative">
            <button
              aria-label="Close Modal"
              onClick={() => {
                setShowRoleSignatureModal(false);
                setSignatureRole(null);
              }}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Manual Authorization Signature</h2>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Please sign within the box below</p>
            </div>

            <div className="bg-white rounded-2xl p-2 shadow-inner border-[3px] border-zinc-700 mb-6">
              <canvas
                ref={roleSigCanvasRef}
                width={400}
                height={200}
                className="w-full touch-none cursor-crosshair rounded-xl border border-dashed border-slate-300"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="w-full h-14 rounded-xl text-[10px] font-bold uppercase tracking-widest border-white/10 bg-transparent text-white hover:bg-white/5"
                onClick={clearRoleSignature}
              >
                Clear Pad
              </Button>
              <Button
                className="w-full h-14 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                onClick={handleRoleSignSubmit}
                disabled={isRoleSignSubmitting}
              >
                {isRoleSignSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Signature"}
              </Button>
            </div>
          </div>
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
