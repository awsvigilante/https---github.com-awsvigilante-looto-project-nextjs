import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import type { LotoTask } from "./LotoTask";
import { User } from "./User";

@Entity("contractor_locks")
export class ContractorLock {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  taskId!: string;

  @ManyToOne("LotoTask", (task: any) => task.contractorLocks)
  @JoinColumn({ name: "taskId" })
  task!: LotoTask;

  @Column({ type: "uuid" })
  contractorId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "contractorId" })
  contractor!: User;

  @Column({ type: "varchar", nullable: true })
  contractorName?: string;

  @Column({ type: "varchar", nullable: true })
  contractorPhone?: string;

  @Column({ type: "varchar" })
  trade!: string;

  @Column({ type: "varchar" })
  description!: string;
  
  // LOCK ON phase
  @Column({ type: "text", nullable: true })
  lockOnSignature?: string; // base64

  @Column({ type: "text", nullable: true })
  lockOnPhoto?: string; // base64

  @Column({ type: "timestamp", nullable: true })
  lockedOnAt?: Date;

  // LOCK OFF phase
  @Column({ type: "varchar", nullable: true })
  lockOffType?: string; // "Self", "Other", "N/A"

  @Column({ type: "text", nullable: true })
  lockOffNote?: string;

  @Column({ type: "timestamp", nullable: true })
  lockedOffAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
