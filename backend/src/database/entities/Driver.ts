import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from "typeorm";
import { User } from "./User";

export enum DriverStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
}

@Entity("drivers")
export class Driver {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne(() => User)
  @JoinColumn()
  user!: User;

  @Column({
    type: "enum",
    enum: DriverStatus,
    default: DriverStatus.OFFLINE,
  })
  status!: DriverStatus;

  @Column({ default: true })
  isAvailable!: boolean;

  @Column({
    type: "geography",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true,
  })
  currentLocation!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
