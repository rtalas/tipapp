import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamFlag } from './team-flag'

describe('TeamFlag', () => {
  describe('Emoji/Icon rendering', () => {
    it('renders emoji when flagType is icon', () => {
      render(
        <TeamFlag
          flagIcon="🇨🇿"
          flagType="icon"
          teamName="Czech Republic"
        />
      )
      const flag = screen.getByRole('img', { name: 'Czech Republic flag' })
      expect(flag).toBeInTheDocument()
      expect(flag).toHaveTextContent('🇨🇿')
    })

    it('renders team symbol emoji', () => {
      render(
        <TeamFlag
          flagIcon="🐆"
          flagType="icon"
          teamName="Panthers"
        />
      )
      const flag = screen.getByRole('img', { name: 'Panthers flag' })
      expect(flag).toBeInTheDocument()
      expect(flag).toHaveTextContent('🐆')
    })
  })

  describe('Image path rendering', () => {
    it('renders Image component when flagType is path with valid path', () => {
      const { container } = render(
        <TeamFlag
          flagIcon="/logos/panthers.png"
          flagType="path"
          teamName="Panthers"
        />
      )
      const img = container.querySelector('img')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('alt', 'Panthers logo')
    })

    it('renders fallback for invalid path (not starting with /logos/)', () => {
      render(
        <TeamFlag
          flagIcon="/images/team.png"
          flagType="path"
          teamName="Panthers"
        />
      )
      const fallback = screen.getByLabelText('Panthers logo')
      expect(fallback).toBeInTheDocument()
      expect(fallback).toHaveTextContent('P')
    })

    it('renders fallback for invalid file extension', () => {
      render(
        <TeamFlag
          flagIcon="/logos/team.exe"
          flagType="path"
          teamName="Panthers"
        />
      )
      const fallback = screen.getByLabelText('Panthers logo')
      expect(fallback).toBeInTheDocument()
      expect(fallback).toHaveTextContent('P')
    })

    it('accepts valid image extensions', () => {
      const extensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
      extensions.forEach((ext) => {
        const { container } = render(
          <TeamFlag
            flagIcon={`/logos/team${ext}`}
            flagType="path"
            teamName="Team"
          />
        )
        const img = container.querySelector('img')
        expect(img).toBeInTheDocument()
      })
    })
  })

  describe('Fallback rendering', () => {
    it('renders fallback when flagIcon is null', () => {
      render(
        <TeamFlag
          flagIcon={null}
          flagType="icon"
          teamName="Panthers"
        />
      )
      const fallback = screen.getByLabelText('Panthers logo')
      expect(fallback).toBeInTheDocument()
      expect(fallback).toHaveTextContent('P')
    })

    it('renders fallback when flagType is null', () => {
      render(
        <TeamFlag
          flagIcon="🇨🇿"
          flagType={null}
          teamName="Czech Republic"
        />
      )
      const fallback = screen.getByLabelText('Czech Republic logo')
      expect(fallback).toBeInTheDocument()
      expect(fallback).toHaveTextContent('C')
    })

    it('renders fallback when both are null', () => {
      render(
        <TeamFlag
          flagIcon={null}
          flagType={null}
          teamName="Panthers"
        />
      )
      const fallback = screen.getByLabelText('Panthers logo')
      expect(fallback).toBeInTheDocument()
      expect(fallback).toHaveTextContent('P')
    })

    it('renders fallback for unknown flagType', () => {
      render(
        <TeamFlag
          flagIcon="some-value"
          flagType="unknown"
          teamName="Panthers"
        />
      )
      const fallback = screen.getByLabelText('Panthers logo')
      expect(fallback).toBeInTheDocument()
      expect(fallback).toHaveTextContent('P')
    })

    it('renders first letter uppercase in fallback', () => {
      render(
        <TeamFlag
          flagIcon={null}
          flagType={null}
          teamName="panthers"
        />
      )
      const fallback = screen.getByLabelText('panthers logo')
      expect(fallback).toHaveTextContent('P')
    })
  })

  describe('Size variants', () => {
    it('renders with xs size', () => {
      render(
        <TeamFlag
          flagIcon="🇨🇿"
          flagType="icon"
          teamName="Czech Republic"
          size="xs"
        />
      )
      const flag = screen.getByRole('img')
      expect(flag).toHaveClass('w-4', 'h-4')
    })

    it('renders with sm size', () => {
      render(
        <TeamFlag
          flagIcon="🇨🇿"
          flagType="icon"
          teamName="Czech Republic"
          size="sm"
        />
      )
      const flag = screen.getByRole('img')
      expect(flag).toHaveClass('w-5', 'h-5')
    })

    it('renders with md size (default)', () => {
      render(
        <TeamFlag
          flagIcon="🇨🇿"
          flagType="icon"
          teamName="Czech Republic"
        />
      )
      const flag = screen.getByRole('img')
      expect(flag).toHaveClass('w-6', 'h-6')
    })

    it('renders with lg size', () => {
      render(
        <TeamFlag
          flagIcon="🇨🇿"
          flagType="icon"
          teamName="Czech Republic"
          size="lg"
        />
      )
      const flag = screen.getByRole('img')
      expect(flag).toHaveClass('w-8', 'h-8')
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label for icon type', () => {
      render(
        <TeamFlag
          flagIcon="🇨🇿"
          flagType="icon"
          teamName="Czech Republic"
        />
      )
      expect(screen.getByLabelText('Czech Republic flag')).toBeInTheDocument()
    })

    it('has proper alt text for image type', () => {
      const { container } = render(
        <TeamFlag
          flagIcon="/logos/team.png"
          flagType="path"
          teamName="Panthers"
        />
      )
      const img = container.querySelector('img')
      expect(img).toHaveAttribute('alt', 'Panthers logo')
    })

    it('has proper aria-label for fallback', () => {
      render(
        <TeamFlag
          flagIcon={null}
          flagType={null}
          teamName="Panthers"
        />
      )
      expect(screen.getByLabelText('Panthers logo')).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('applies custom className to icon type', () => {
      render(
        <TeamFlag
          flagIcon="🇨🇿"
          flagType="icon"
          teamName="Czech Republic"
          className="custom-class"
        />
      )
      const flag = screen.getByRole('img')
      expect(flag).toHaveClass('custom-class')
    })

    it('applies custom className to fallback', () => {
      render(
        <TeamFlag
          flagIcon={null}
          flagType={null}
          teamName="Panthers"
          className="custom-class"
        />
      )
      const fallback = screen.getByLabelText('Panthers logo')
      expect(fallback).toHaveClass('custom-class')
    })
  })
})
