// home.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  // Static data for demonstration
  statistics = {
    totalProjects: 324,
    projectsThisYear: 57,
    popularDomains: ['AI/ML', 'Web Dev', 'Mobile Apps', 'IoT']
  };

  recentActivities = [
    {
      id: '1',
      icon: '📄',
      description: 'New project proposal uploaded: "AI-Enhanced Traffic Management System"',
      time: '2 hours ago'
    },
    {
      id: '2',
      icon: '🔍',
      description: 'Similarity check completed for "Smart Home Automation"',
      time: '5 hours ago'
    },
    {
      id: '3',
      icon: '💡',
      description: 'New recommendation generated in "Machine Learning" domain',
      time: '1 day ago'
    }
  ];
}