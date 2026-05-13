import Swal from 'sweetalert2';

export type ToggleableStatus = 'active' | 'inactive';

/** Success dialog after activate/deactivate (purple OK, like FAQ activated). */
export function showStatusToggleSuccessModal(label: string, next: ToggleableStatus): void {
  const verb = next === 'active' ? 'activated' : 'deactivated';
  void Swal.fire({
    icon: 'success',
    title: `${label} ${verb}`,
    confirmButtonText: 'OK',
    confirmButtonColor: '#7066e0',
  });
}
