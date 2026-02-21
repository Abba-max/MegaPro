import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface User {
    name: string;
    email: string;
    role: 'Admin' | 'Student' | 'Owner';
    initials: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    currentUser$ = this.currentUserSubject.asObservable();

    // Login Modal Control
    private showLoginModalSubject = new Subject<boolean>();
    showLoginModal$ = this.showLoginModalSubject.asObservable();

    constructor() { }

    login(email: string, password: string): boolean {
        let user: User | null = null;

        if (email === 'admin@test.com' && password === 'admin123') {
            user = { name: 'Admin Eyang', email, role: 'Admin', initials: 'AE' };
        } else if (email === 'student@test.com' && password === 'student123') {
            user = { name: 'Marie Kamga', email, role: 'Student', initials: 'MK' };
        } else if (email === 'owner@test.com' && password === 'owner123') {
            user = { name: 'Boris Mvovlov', email, role: 'Owner', initials: 'BM' };
        }

        if (user) {
            this.currentUserSubject.next(user);
            return true;
        }
        return false;
    }

    logout() {
        this.currentUserSubject.next(null);
    }

    isLoggedIn(): boolean {
        return this.currentUserSubject.value !== null;
    }

    openLogin() {
        this.showLoginModalSubject.next(true);
    }

    closeLogin() {
        this.showLoginModalSubject.next(false);
    }

    setUser(user: User) {
        this.currentUserSubject.next(user);
    }
}
