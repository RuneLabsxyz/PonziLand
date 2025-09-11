<!-- TypingEffect.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  // Props
  let {
    html = '',
    speed = 50,
    cursor = '|',
    showCursor = true,
    onComplete = () => {},
  } = $props();

  // State
  let displayedHtml = $state('');
  let currentIndex = $state(0);
  let isTyping = $state(false);
  let cursorVisible = $state(true);
  let plainText = $state('');
  let lastHtml = $state('');

  // Extract plain text from HTML for character counting
  function getPlainText(htmlString: string) {
    const div = document.createElement('div');
    div.innerHTML = htmlString;
    return div.textContent || div.innerText || '';
  }

  // Get HTML up to a certain character position
  function getHtmlUpToPosition(htmlString: string, position: number) {
    if (position <= 0) return '';

    const div = document.createElement('div');
    div.innerHTML = htmlString;

    let charCount = 0;
    let result = '';

    function traverseNodes(node: Node, targetCount: number) {
      if (charCount >= targetCount) return '';

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? '';
        const remainingChars = targetCount - charCount;

        if (text.length <= remainingChars) {
          charCount += text.length;
          return text;
        } else {
          charCount = targetCount;
          return text.substring(0, remainingChars);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = (node as Element).tagName.toLowerCase();
        let content = '';

        for (let i = 0; i < node.childNodes.length; i++) {
          if (charCount >= targetCount) break;
          content += traverseNodes(node.childNodes[i], targetCount);
        }

        if (content.length > 0 || charCount >= targetCount) {
          return `<${tagName}${getAttributes(node as Element)}>${content}</${tagName}>`;
        }
        return '';
      }

      return '';
    }

    function getAttributes(element: Element) {
      let attrs = '';
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        attrs += ` ${attr.name}="${attr.value}"`;
      }
      return attrs;
    }

    for (let i = 0; i < div.childNodes.length; i++) {
      if (charCount >= position) break;
      result += traverseNodes(div.childNodes[i], position);
    }

    return result;
  }

  // Reactive effect that triggers when html prop changes
  $effect(() => {
    if (html !== lastHtml && html.length > 0) {
      lastHtml = html;
      plainText = getPlainText(html);
      startTyping();
    }
  });

  // Cursor blinking effect
  $effect(() => {
    if (!showCursor) return;

    const interval = setInterval(() => {
      cursorVisible = !cursorVisible;
    }, 500);

    return () => clearInterval(interval);
  });

  function startTyping() {
    // Reset state
    displayedHtml = '';
    currentIndex = 0;
    isTyping = true;

    // Start typing animation
    const typeNextChar = () => {
      if (currentIndex < plainText.length) {
        currentIndex++;
        displayedHtml = getHtmlUpToPosition(html, currentIndex);
        setTimeout(typeNextChar, speed);
      } else {
        isTyping = false;
        onComplete();
      }
    };

    typeNextChar();
  }

  // Initialize on mount if html is provided
  onMount(() => {
    if (html) {
      lastHtml = html;
      plainText = getPlainText(html);
      startTyping();
    }
  });
</script>

<span class="typing-effect">
  {@html displayedHtml}
  {#if showCursor && (isTyping || cursorVisible)}
    <span class="cursor">{cursor}</span>
  {/if}
</span>

<style>
  .cursor {
    opacity: 1;
    animation: none;
  }
</style>
