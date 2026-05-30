import type { ChangeEvent, FormEvent } from "react";
import UserFormModal from "./UserFormModal";

interface StaffFormState {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "user";
  phone: string;
  is_active: boolean;
  profile_image?: File | null;
  profile_image_url?: string;
}

interface StaffFormModalProps {
  show: boolean;
  editMode: boolean;
  isSubmitting?: boolean;
  staffForm: StaffFormState;
  onClose: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onImageChange: (file: File, previewUrl: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

const StaffFormModal = ({ show, editMode, isSubmitting = false, staffForm, onClose, onChange, onImageChange, onSubmit }: StaffFormModalProps) => (
  <UserFormModal
    show={show}
    editMode={editMode}
    isSubmitting={isSubmitting}
    title={editMode ? "Edit Staff" : "Create Staff"}
    subtitle={
      editMode
        ? "Update staff account details and access."
        : "Create a staff account for technicians, counter staff, or internal team members."
    }
    userForm={staffForm}
    onClose={onClose}
    onChange={onChange}
    onImageChange={onImageChange}
    onSubmit={onSubmit}
  />
);

export default StaffFormModal;
