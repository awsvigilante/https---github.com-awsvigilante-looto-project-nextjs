import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar" })
  password!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", default: "company" }) // company or contractor
  type!: string;

  @Column({ type: "varchar", default: "operator" }) // we will refine roles later
  role!: string;

  @Column({ type: "varchar", nullable: true })
  lotoId?: string;

  @Column({ type: "varchar", nullable: true })
  contractorNumber?: string;

  @Column({ type: "varchar", nullable: true })
  resetToken?: string;

  @Column({ type: "timestamp", nullable: true })
  resetTokenExpiry?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
