import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import type { ContractorLock } from "./ContractorLock";

@Entity("loto_tasks")
export class LotoTask {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  lotoId!: string; // e.g. LOTO-2026-000001

  @Column({ type: "varchar" })
  facility!: string;

  @Column({ type: "varchar" })
  lockBoxNumber!: string;

  @Column({ type: "text" })
  reasonForIsolation!: string;

  @Column({ type: "varchar" })
  redTagMasterNo!: string;

  @Column({ type: "varchar" })
  equipmentName!: string;

  @Column({ type: "varchar" })
  expectedDuration!: string;

  @Column({ type: "int" })
  numIsolationPoints!: number;

  @Column({ type: "varchar", default: "Draft" })
  status!: string;
  // Draft → Pending Approval → Approved → Isolation In Progress
  // → Isolation Complete → Isolation Verified / Active → Closed

  // --- Relationships (stored as UUID columns) ---
  @Column({ type: "uuid" })
  creatorId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "creatorId" })
  creator!: User;

  @Column({ type: "varchar", nullable: true })
  supervisorId?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "supervisorId" })
  supervisor?: User;

  @Column({ type: "varchar", nullable: true })
  primaryOperatorId?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "primaryOperatorId" })
  primaryOperator?: User;

  @Column({ type: "varchar", nullable: true })
  approverId?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "approverId" })
  approver?: User;

  @Column({ type: "varchar", nullable: true })
  approvedById?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "approvedById" })
  approvedBy?: User;

  // --- Operator signature block ---
  @Column({ type: "text", nullable: true })
  operatorSignature?: string;

  @Column({ type: "varchar", nullable: true })
  operatorSignedAt?: string;

  // --- Supervisor signature block ---
  @Column({ type: "text", nullable: true })
  supervisorSignature?: string;

  @Column({ type: "varchar", nullable: true })
  supervisorSignedAt?: string;

  @Column({ type: "varchar", nullable: true })
  tagsAttachedAt?: string;

  // --- Delot signature block ---
  @Column({ type: "text", nullable: true })
  maintenanceSignature?: string;

  @Column({ type: "varchar", nullable: true })
  maintenanceSignedAt?: string;

  @Column({ type: "text", nullable: true })
  finalOperatorSignature?: string;

  @Column({ type: "varchar", nullable: true })
  finalOperatorSignedAt?: string;

  @Column({ type: "text", nullable: true })
  approverNote?: string;

  @Column({ type: "jsonb", nullable: true, default: [] })
  comments?: any[];

  @OneToMany("ContractorLock", (lock: any) => lock.task)
  contractorLocks!: ContractorLock[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
