document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const tasksLeftSpan = document.getElementById('tasks-left');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // State
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';

    // Initialize the app
    function init() {
        renderTasks();
        updateTasksLeft();
        setupEventListeners();
        checkThemePreference();
    }

    // Set up event listeners
    function setupEventListeners() {
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask();
        });

        clearCompletedBtn.addEventListener('click', clearCompletedTasks);
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                renderTasks();
            });
        });

        themeToggleBtn.addEventListener('click', toggleTheme);

        // Setup drag and drop
        setupDragAndDrop();
    }

    // Add a new task
    function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText === '') {
            animateInputShake();
            return;
        }

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.unshift(newTask);
        saveTasks();
        renderTasks();
        updateTasksLeft();
        
        taskInput.value = '';
        taskInput.focus();
        animateAddTask();
    }

    // Render tasks based on current filter
    function renderTasks() {
        taskList.innerHTML = '';

        let filteredTasks = tasks;
        if (currentFilter === 'active') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        }

        if (filteredTasks.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = getEmptyMessage();
            emptyMessage.classList.add('empty-message');
            taskList.appendChild(emptyMessage);
            return;
        }

        filteredTasks.forEach((task, index) => {
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            taskItem.draggable = true;
            taskItem.dataset.id = task.id;
            taskItem.dataset.index = index;

            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                <button class="task-delete"><i class="fas fa-trash-alt"></i></button>
            `;

            taskList.appendChild(taskItem);
        });

        // Add event listeners to checkboxes and delete buttons
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', toggleTaskComplete);
        });

        document.querySelectorAll('.task-delete').forEach(btn => {
            btn.addEventListener('click', deleteTask);
        });
    }

    function getEmptyMessage() {
        switch(currentFilter) {
            case 'all': return 'No tasks yet! Add one above!';
            case 'active': return 'No active tasks! You\'re all caught up!';
            case 'completed': return 'No completed tasks yet!';
            default: return 'Nothing to show!';
        }
    }

    // Toggle task completion status
    function toggleTaskComplete(e) {
        const taskId = parseInt(e.target.closest('.task-item').dataset.id);
        const task = tasks.find(task => task.id === taskId);
        
        if (task) {
            task.completed = e.target.checked;
            saveTasks();
            renderTasks();
            updateTasksLeft();
            
            // Add celebration for completing tasks
            if (task.completed) {
                animateTaskComplete(e.target.closest('.task-item'));
            }
        }
    }

    // Delete a task
    function deleteTask(e) {
        const taskItem = e.target.closest('.task-item');
        animateTaskRemove(taskItem, () => {
            const taskId = parseInt(taskItem.dataset.id);
            tasks = tasks.filter(task => task.id !== taskId);
            saveTasks();
            renderTasks();
            updateTasksLeft();
        });
    }

    // Clear all completed tasks
    function clearCompletedTasks() {
        if (!tasks.some(task => task.completed)) {
            animateButtonShake(clearCompletedBtn);
            return;
        }
        
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
        updateTasksLeft();
        animateClearCompleted();
    }

    // Update the "tasks left" counter
    function updateTasksLeft() {
        const activeTasks = tasks.filter(task => !task.completed).length;
        tasksLeftSpan.textContent = `${activeTasks} ${activeTasks === 1 ? 'task' : 'tasks'} waiting`;
    }

    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Drag and drop functionality
    function setupDragAndDrop() {
        let draggedItem = null;

        taskList.addEventListener('dragstart', function(e) {
            if (e.target.classList.contains('task-item')) {
                draggedItem = e.target;
                setTimeout(() => {
                    e.target.classList.add('dragging');
                }, 0);
            }
        });

        taskList.addEventListener('dragover', function(e) {
            e.preventDefault();
            const afterElement = getDragAfterElement(e.clientY);
            const currentElement = document.querySelector('.dragging');
            
            if (afterElement == null) {
                taskList.appendChild(currentElement);
            } else {
                taskList.insertBefore(currentElement, afterElement);
            }
        });

        taskList.addEventListener('dragend', function() {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                
                // Update tasks array order
                const newTaskList = Array.from(taskList.children);
                const newTasksOrder = newTaskList.map(item => 
                    tasks.find(task => task.id === parseInt(item.dataset.id))
                ).filter(task => task !== undefined);
                
                tasks = newTasksOrder;
                saveTasks();
                draggedItem = null;
            }
        });

        function getDragAfterElement(y) {
            const draggableElements = [...taskList.querySelectorAll('.task-item:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    }

    // Theme toggle functionality
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        updateThemeIcon(isDarkMode);
        animateThemeToggle();
    }

    function checkThemePreference() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
        }
        updateThemeIcon(darkMode);
    }

    function updateThemeIcon(isDarkMode) {
        const icon = themeToggleBtn.querySelector('i');
        icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Animation functions
    function animateInputShake() {
        taskInput.style.transform = 'translateX(-5px)';
        setTimeout(() => {
            taskInput.style.transform = 'translateX(5px)';
            setTimeout(() => {
                taskInput.style.transform = 'translateX(0)';
            }, 100);
        }, 100);
    }

    function animateAddTask() {
        addTaskBtn.style.transform = 'scale(1.2)';
        addTaskBtn.style.backgroundColor = 'var(--highlight-color)';
        setTimeout(() => {
            addTaskBtn.style.transform = 'scale(1)';
            addTaskBtn.style.backgroundColor = 'var(--accent-color)';
        }, 300);
    }

    function animateTaskComplete(taskItem) {
        taskItem.style.backgroundColor = 'var(--highlight-color)';
        setTimeout(() => {
            taskItem.style.backgroundColor = '';
        }, 500);
    }

    function animateTaskRemove(taskItem, callback) {
        taskItem.style.transform = 'translateX(100%)';
        taskItem.style.opacity = '0';
        setTimeout(callback, 300);
    }

    function animateButtonShake(button) {
        button.style.transform = 'rotate(-5deg)';
        setTimeout(() => {
            button.style.transform = 'rotate(5deg)';
            setTimeout(() => {
                button.style.transform = 'rotate(0)';
            }, 100);
        }, 100);
    }

    function animateClearCompleted() {
        clearCompletedBtn.style.transform = 'scale(0.9)';
        clearCompletedBtn.style.backgroundColor = 'var(--highlight-color)';
        setTimeout(() => {
            clearCompletedBtn.style.transform = 'scale(1)';
            clearCompletedBtn.style.backgroundColor = 'var(--accent-color)';
        }, 300);
    }

    function animateThemeToggle() {
        themeToggleBtn.style.transform = 'rotate(180deg) scale(1.2)';
        setTimeout(() => {
            themeToggleBtn.style.transform = 'rotate(0) scale(1)';
        }, 300);
    }

    // Initialize the app
    init();
});
