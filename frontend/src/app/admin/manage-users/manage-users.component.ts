import { Component, OnInit, OnDestroy } from '@angular/core'; // Add OnDestroy
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../shared/services/admin.service';
import { User, Programme } from '../../models/user';
import { PaginatedResponse } from '../../models/paginated-response'; // Import PaginatedResponse
import { Subject } from 'rxjs'; // Import Subject
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators'; // Import operators

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.css'
})
export class ManageUsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  // filteredUsers: User[] = []; // Remove client-side filtered array
  isLoading: boolean = true;
  error: string | null = null;
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  
  // Filters & Search
  searchTerm: string = '';
  statusFilter: string = ''; // Use empty string for 'all'
  roleFilter: string = '';   // Use empty string for 'all'
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>(); // For unsubscribing

  constructor(private adminService: AdminService) {}
  
  ngOnInit(): void {
    this.loadUsers();
    
    // Debounce search input
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after last keystroke
      distinctUntilChanged(), // Only emit if value changed
      takeUntil(this.destroy$) // Unsubscribe on component destroy
    ).subscribe(() => {
      this.currentPage = 1; // Reset to first page on search
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadUsers(): void {
    this.isLoading = true;
    this.error = null;
    
    console.log('ManageUsersComponent: loadUsers - Starting to load users');
    
    // Prepare filter parameters (pass undefined if empty string)
    const status = this.statusFilter || undefined;
    const role = this.roleFilter || undefined;
    const search = this.searchTerm || undefined;
    
    console.log('ManageUsersComponent: loadUsers - Filters:', { 
      page: this.currentPage, 
      limit: this.itemsPerPage, 
      status, 
      role, 
      search 
    });

    this.adminService.getAllUsers(this.currentPage, this.itemsPerPage, status, role, search)
      .pipe(takeUntil(this.destroy$)) // Unsubscribe on component destroy
      .subscribe({
        next: (response: PaginatedResponse<User>) => {
          console.log('ManageUsersComponent: loadUsers - Received response:', response);
          this.users = response.data;
          console.log('ManageUsersComponent: loadUsers - Users array:', this.users);
          this.totalItems = response.total;
          // this.applyFilters(); // Remove client-side filtering
          this.isLoading = false;
        },
        error: (error) => {
          console.error('ManageUsersComponent: loadUsers - Error loading users:', error);
          this.error = 'Failed to load users. Please try again.';
          this.isLoading = false;
          this.users = []; // Clear users on error
          this.totalItems = 0;
        }
    });
  }
  
  // Method to handle search input changes
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  // Method to handle filter changes
  onFilterChange(): void {
    this.currentPage = 1; // Reset to first page on filter change
    this.loadUsers();
  }

  // Method for pagination change
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  // applyFilters(): void { ... } // Remove this method

  updateUserStatus(userId: string, status: 'active' | 'suspended'): void {
    const action = status === 'active' ? 'activate' : 'suspend';
    if (confirm(`Are you sure you want to ${action} this user?`)) {
      this.adminService.updateUserStatus(userId, status)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Update user status in the local array optimistically
            // or reload the current page of users
            const userIndex = this.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
              this.users[userIndex].status = status;
              // Optionally: show success message
            } else {
              // If user not found on current page (edge case), reload
              this.loadUsers(); 
            }
          },
          error: (error) => {
            alert(`An error occurred while trying to ${action} the user. Please try again.`);
            console.error(`Error ${action}ing user:`, error);
          }
      });
    }
  }
  
  deleteUser(userId: string): void {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      this.adminService.deleteUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Reload users after successful deletion
            // Check if deleting the last item on a page requires going back a page
            if (this.users.length === 1 && this.currentPage > 1) {
              this.currentPage--;
            }
            this.loadUsers(); 
            // Optionally: show success message
          },
          error: (error) => {
            // Handle specific error messages from backend if available
            const message = error?.error?.message || 'An error occurred while deleting the user.';
            alert(`${message} Please try again.`);
            console.error('Error deleting user:', error);
          }
      });
    }
  }
  
  // activateUser method is now handled by updateUserStatus('active')
  // suspendUser method is now handled by updateUserStatus('suspended')

  // Helper for calculating total pages (optional, can be done in template)
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }
  
  // Helper to get programme name
  getProgrammeName(programme: any): string {
    if (programme && typeof programme === 'object') {
      return programme.fullName || programme.abbreviation || 'N/A';
    }
    return programme || 'N/A';
  }
}
