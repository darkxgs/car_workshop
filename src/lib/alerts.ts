import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Base options for dark theme that matches the app
const baseOptions = {
    background: '#0a0f1c', // Card bg
    color: '#f8fafc',      // Foreground
    customClass: {
        popup: 'border border-cyan-900/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.1)]',
        title: 'text-foreground font-display font-bold',
        htmlContainer: 'text-muted-foreground font-ibm',
        confirmButton: 'bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-5 py-2.5 font-bold transition-colors',
        cancelButton: 'bg-muted hover:bg-muted/80 text-foreground rounded-xl px-5 py-2.5 font-bold transition-colors border border-border',
        denyButton: 'bg-rose-600 hover:bg-rose-500 text-white rounded-xl px-5 py-2.5 font-bold transition-colors',
        actions: 'gap-3'
    },
    buttonsStyling: false,
};

export const showSuccess = (title: string, text?: string) => {
    return MySwal.fire({
        ...baseOptions,
        icon: 'success',
        iconColor: '#10b981', // emerald-500
        title,
        text,
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
    });
};

export const showError = (title: string, text?: string) => {
    return MySwal.fire({
        ...baseOptions,
        icon: 'error',
        iconColor: '#f43f5e', // rose-500
        title,
        text,
        timer: 4000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
    });
};

export const showConfirm = async (title: string, text: string, confirmText: string = 'تأكيد', isDanger: boolean = false) => {
    const result = await MySwal.fire({
        ...baseOptions,
        icon: 'warning',
        iconColor: isDanger ? '#f43f5e' : '#eab308',
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: 'إلغاء',
        customClass: {
            ...baseOptions.customClass,
            confirmButton: isDanger 
                ? 'bg-rose-600 hover:bg-rose-500 text-white rounded-xl px-5 py-2.5 font-bold transition-colors'
                : baseOptions.customClass.confirmButton
        }
    });
    return result.isConfirmed;
};
