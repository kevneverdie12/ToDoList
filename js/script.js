// IIFE to encapsulate the entire script and avoid polluting the global scope
(function() {
    "use strict"; // Enforce stricter parsing and error handling

    // SELECTORS
    const todoForm = document.querySelector('.todo-form');
    const todoInput = document.querySelector('.todo-input');
    const todoDateInput = document.querySelector('.todo-date-input');
    const todoDescriptionInput = document.querySelector('.todo-description-input');
    const todoList = document.querySelector('.todo-list');
    const filterOption = document.querySelector('.filter-todo');
    const errorMessage = document.querySelector('.error-message');
    
    // Modal Selectors
    const historyBtn = document.querySelector('.history-btn');
    const modal = document.getElementById('historyModal');
    const closeBtn = document.querySelector('.close-btn');
    const historyList = document.getElementById('historyList');

    // STATE: The single source of truth for our application
    let state = {
        todos: [],
        history: [],
        currentFilter: 'all'
    };
    
    // --- CORE FUNCTIONS ---

    /**
     * Main render function. It clears the list and re-renders it
     * based on the current state and filter.
     */
    function render() {
        todoList.innerHTML = ''; // Clear the current list in the DOM
        
        const filteredTodos = state.todos.filter(todo => {
            if (state.currentFilter === 'completed') return todo.completed;
            if (state.currentFilter === 'incomplete') return !todo.completed;
            return true; // for 'all'
        });

        if (filteredTodos.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No tasks here. Add one above!';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.color = '#aaa';
            todoList.appendChild(emptyMessage);
        } else {
            filteredTodos.forEach(todo => {
                const todoElement = createTodoElement(todo);
                todoList.appendChild(todoElement);
            });
        }
    }

    /**
     * Renders the history list in the modal.
     */
    function renderHistory() {
        historyList.innerHTML = '';
        if (state.history.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.textContent = 'No activity yet.';
            historyList.appendChild(emptyLi);
        } else {
            state.history.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `[${item.timestamp}] - ${item.action}`;
                historyList.appendChild(li);
            });
        }
    }


    // --- EVENT HANDLERS ---

    /**
     * Handles the form submission to add a new todo.
     * @param {Event} event - The form submission event.
     */
    function handleAddTodo(event) {
        event.preventDefault();

        const title = todoInput.value.trim();
        const date = todoDateInput.value;

        if (title === '' || date === '') {
            showError("Task title and date cannot be empty!");
            return;
        }
        hideError();

        const newTodo = {
            id: Date.now(),
            text: title,
            description: todoDescriptionInput.value.trim(),
            date: date,
            completed: false
        };

        // 1. Update State
        state.todos.push(newTodo);
        logHistory(`Added task: "${newTodo.text}"`);

        // 2. Save and Re-render
        saveState();
        render();

        // 3. Reset UI
        todoForm.reset();
        todoInput.focus();
    }

    /**
     * Handles all clicks within the todo list (complete, delete, expand).
     * Uses event delegation for efficiency.
     * @param {Event} e - The click event.
     */
    function handleListClick(e) {
        const target = e.target;
        const todoDiv = target.closest('.todo');
        if (!todoDiv) return;

        const todoId = Number(todoDiv.dataset.id);
        let taskText = state.todos.find(t => t.id === todoId)?.text || '';
        let needsRender = false;

        if (target.closest('.trash-btn')) {
            state.todos = state.todos.filter(todo => todo.id !== todoId);
            logHistory(`Removed task: "${taskText}"`);
            needsRender = true;
        } else if (target.closest('.complete-btn')) {
            const todoToUpdate = state.todos.find(todo => todo.id === todoId);
            if (todoToUpdate) {
                todoToUpdate.completed = !todoToUpdate.completed;
                const action = todoToUpdate.completed ? 'Completed' : 'Marked as incomplete';
                logHistory(`${action} task: "${taskText}"`);
                needsRender = true;
            }
        } else if (target.closest('.todo-item')) {
            // Toggle expansion directly on the DOM, as it's a view-only state
            target.closest('.todo-item').classList.toggle('expanded');
        }

        if (needsRender) {
            saveState();
            render();
        }
    }
    
    /**
     * Handles changes in the filter dropdown.
     * @param {Event} e - The change event.
     */
    function handleFilterChange(e) {
        state.currentFilter = e.target.value;
        render(); // No need to save state, as filter is not persistent
    }


    // --- LOCAL STORAGE & STATE MANAGEMENT ---

    function checkStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error reading ${key} from localStorage`, e);
            return [];
        }
    }

    function saveState() {
        localStorage.setItem('todos', JSON.stringify(state.todos));
        localStorage.setItem('history', JSON.stringify(state.history));
    }
    
    function loadState() {
        state.todos = checkStorage('todos');
        state.history = checkStorage('history');
    }

    function logHistory(action) {
        const timestamp = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: false });
        state.history.unshift({ action, timestamp });
        if (state.history.length > 30) { // Limit history to 30 items
            state.history.pop();
        }
        // Note: We don't save or render here. That's done by the calling function.
    }
    
    
    // --- UI & HELPER FUNCTIONS ---
    
    /**
     * Creates a DOM element for a single todo item.
     * @param {object} todoData - The todo object from state.
     * @returns {HTMLElement} The created div element for the todo.
     */
    function createTodoElement(todoData) {
        const todoDiv = document.createElement('div');
        todoDiv.classList.add('todo');
        todoDiv.dataset.id = todoData.id;

        const todoLi = document.createElement('li');
        todoLi.classList.add('todo-item');
        if (todoData.completed) {
            todoLi.classList.add('completed');
        }

        // Create elements manually to prevent XSS
        const todoTextDiv = document.createElement('div');
        todoTextDiv.className = 'todo-text';
        todoTextDiv.textContent = todoData.text;

        const todoDateDiv = document.createElement('div');
        todoDateDiv.className = 'todo-date';
        todoDateDiv.textContent = formatDate(todoData.date);

        const todoDescriptionDiv = document.createElement('div');
        todoDescriptionDiv.className = 'todo-description';
        todoDescriptionDiv.textContent = todoData.description || 'No description';
        
        todoLi.appendChild(todoTextDiv);
        todoLi.appendChild(todoDateDiv);
        todoLi.appendChild(todoDescriptionDiv);

        const completeBtn = document.createElement('button');
        completeBtn.className = 'complete-btn';
        completeBtn.setAttribute('aria-label', 'Complete Task');
        completeBtn.innerHTML = '<i class="fas fa-check-circle"></i>';
        
        const trashBtn = document.createElement('button');
        trashBtn.className = 'trash-btn';
        trashBtn.setAttribute('aria-label', 'Delete Task');
        trashBtn.innerHTML = '<i class="fas fa-trash"></i>';

        todoDiv.appendChild(todoLi);
        todoDiv.appendChild(completeBtn);
        todoDiv.appendChild(trashBtn);

        return todoDiv;
    }
    
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        // Adding T00:00:00 prevents timezone issues where the date might be off by one.
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', options);
    }
    
    function showError(message) {
        errorMessage.textContent = message;
    }

    function hideError() {
        errorMessage.textContent = '';
    }

    // Modal Functions
    function openModal() {
        renderHistory();
        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
    }


    // --- EVENT LISTENERS ---
    
    document.addEventListener('DOMContentLoaded', () => {
        loadState();
        render();
    });

    todoForm.addEventListener('submit', handleAddTodo);
    todoList.addEventListener('click', handleListClick);
    filterOption.addEventListener('change', handleFilterChange);
    
    // Modal events
    historyBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            closeModal();
        }
    });

})(); // End of IIFE